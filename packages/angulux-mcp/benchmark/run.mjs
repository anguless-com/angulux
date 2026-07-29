#!/usr/bin/env node
/**
 * run — the two-arm hallucination benchmark (AC-12).
 *
 * Asks the same 20 questions twice: once with the angulux MCP server's tools attached, once
 * with no tools at all. The second arm is the control, and it is recorded whichever way it
 * goes — a benchmark that only publishes the flattering number is an advertisement.
 *
 * WHY THIS SPAWNS THE SERVER ITSELF. The Messages API's MCP connector takes a remote HTTP
 * URL; ours is local stdio and a hosted endpoint is out of scope. So the harness does what a
 * real MCP client does: spawn the server, list its tools, convert them to Anthropic tool
 * definitions, and run the tool loop locally. That exercises the actual wire path an
 * assistant would use.
 *
 * COSTS MONEY. Requires ANTHROPIC_API_KEY (or an `ant auth login` profile).
 *
 * Usage:
 *   node packages/angulux-mcp/benchmark/run.mjs [--model claude-opus-5] [--effort high]
 *                                                [--sample | --limit N]
 *
 * --sample runs one question per kind (5 of 20). Prefer it over --limit for a cheap probe:
 * the set is grouped by kind, so --limit 5 would ask five selector questions and none of the
 * other four kinds.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { ANSWER_SCHEMA, SYSTEM, grade, sampleOnePerKind, summarise, toAnthropicTools } from './harness.mjs';
import { loadCorpus } from '../src/corpus.mjs';

const here = import.meta.dirname;
const BIN = resolve(here, '../bin/angulux-mcp.mjs');

const arg = (flag, fallback) => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : fallback;
};

const MODEL = arg('--model', 'claude-opus-5');
const EFFORT = arg('--effort', 'high');
const LIMIT = Number(arg('--limit', '0')) || Infinity;
const SAMPLE = process.argv.includes('--sample');
const MAX_TOOL_TURNS = 6;

const anthropic = new Anthropic();
const all = JSON.parse(readFileSync(resolve(here, 'questions.json'), 'utf8')).questions;
const questions = SAMPLE ? sampleOnePerKind(all) : all.slice(0, LIMIT);
const corpus = loadCorpus();

/** One question, one arm. Returns the graded result plus what it cost. */
async function ask(question, { tools, mcp }) {
    const messages = [{ role: 'user', content: question.ask }];
    const usage = { input: 0, output: 0, calls: 0, toolCalls: 0 };

    const track = (response) => {
        usage.calls += 1;
        usage.input += response.usage.input_tokens ?? 0;
        usage.output += response.usage.output_tokens ?? 0;
        return response;
    };

    // Phase 1 — let the model work, with tools if this arm has them.
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn += 1) {
        const response = track(
            await anthropic.messages.create({
                model: MODEL,
                max_tokens: 8000,
                system: SYSTEM,
                output_config: { effort: EFFORT },
                ...(tools.length ? { tools } : {}),
                messages
            })
        );

        // Guard before reading content: a refusal is a 200 with an empty or partial body.
        if (response.stop_reason === 'refusal') {
            return { ...grade(question, null), refused: true, usage, answer: null };
        }

        messages.push({ role: 'assistant', content: response.content });

        const toolUses = response.content.filter((block) => block.type === 'tool_use');
        if (toolUses.length === 0) break;

        const results = [];
        for (const use of toolUses) {
            usage.toolCalls += 1;
            const out = await mcp.callTool({ name: use.name, arguments: use.input ?? {} });
            results.push({
                type: 'tool_result',
                tool_use_id: use.id,
                content: out.content.filter((b) => b.type === 'text').map((b) => ({ type: 'text', text: b.text })),
                is_error: out.isError === true
            });
        }
        // All results in ONE user message — splitting them trains the model out of parallel calls.
        messages.push({ role: 'user', content: results });
    }

    // Phase 2 — extract the answer in its own turn, with no tools and a fixed schema, so
    // grading is a field comparison rather than a regex over prose.
    const final = track(
        await anthropic.messages.create({
            model: MODEL,
            max_tokens: 2000,
            system: SYSTEM,
            output_config: { effort: 'low', format: { type: 'json_schema', schema: ANSWER_SCHEMA } },
            messages: [...messages, { role: 'user', content: 'State your final answer only, as JSON.' }]
        })
    );

    if (final.stop_reason === 'refusal') {
        return { ...grade(question, null), refused: true, usage, answer: null };
    }

    const text = final.content.find((b) => b.type === 'text')?.text ?? '';
    let answer = null;
    try {
        answer = JSON.parse(text).answer;
    } catch {
        answer = text;
    }

    return { ...grade(question, answer), refused: false, usage, answer };
}

async function runArm(label, { withTools }) {
    let mcp = null;
    let tools = [];

    if (withTools) {
        mcp = new Client({ name: 'angulux-benchmark', version: '1' }, { capabilities: {} });
        await mcp.connect(new StdioClientTransport({ command: process.execPath, args: [BIN] }));
        tools = toAnthropicTools((await mcp.listTools()).tools);
    }

    const results = [];
    for (const question of questions) {
        // Never let one failed question throw away the ones already paid for. A billing or
        // rate-limit error on question 16 used to lose fifteen answers that cost real money;
        // now it is recorded as a failed question and the run continues.
        let result;
        try {
            result = await ask(question, { tools, mcp });
        } catch (error) {
            const status = error?.status ?? '';
            result = {
                correct: false,
                gaveWrongAnswer: false,
                refused: false,
                error: `${status} ${error?.message ?? error}`.trim(),
                usage: { input: 0, output: 0, calls: 0, toolCalls: 0 },
                answer: null
            };
        }

        results.push({ id: question.id, kind: question.kind, expect: question.expect, ...result });
        const mark = result.error ? 'ERR ' : result.correct ? 'OK  ' : 'MISS';
        process.stderr.write(`  ${label} ${question.id} ${mark} → ${result.error ?? result.answer ?? '(refused)'}\n`);
    }

    await mcp?.close();
    return results;
}

const withMcp = await runArm('withMcp   ', { withTools: true });
const withoutMcp = await runArm('withoutMcp', { withTools: false });

const totals = (rows) =>
    rows.reduce((a, r) => ({ input: a.input + r.usage.input, output: a.output + r.usage.output, calls: a.calls + r.usage.calls }), { input: 0, output: 0, calls: 0 });

const record = {
    runAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    corpusSourceHash: corpus.sourceHash,
    libraryVersion: corpus.libraryVersion,
    questions: withMcp.length,
    subset: SAMPLE ? 'one-per-kind' : questions.length < all.length ? `first ${questions.length}` : 'full',
    arms: {
        withMcp: { ...summarise(withMcp), usage: totals(withMcp), answers: withMcp },
        withoutMcp: { ...summarise(withoutMcp), usage: totals(withoutMcp), answers: withoutMcp }
    }
};

mkdirSync(resolve(here, 'results'), { recursive: true });
const out = resolve(here, 'results', `${record.runAt.slice(0, 10)}.json`);
writeFileSync(out, JSON.stringify(record, null, 4) + '\n');

console.log(`\nwithMcp    ${record.arms.withMcp.correct}/${record.questions} correct, ${record.arms.withMcp.gavePrimeNgAnswer} PrimeNG answers`);
console.log(`withoutMcp ${record.arms.withoutMcp.correct}/${record.questions} correct, ${record.arms.withoutMcp.gavePrimeNgAnswer} PrimeNG answers`);
console.log(`→ ${out}`);
