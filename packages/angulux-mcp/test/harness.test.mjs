import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ANSWER_SCHEMA, grade, sampleOnePerKind, summarise, toAnthropicTools } from '../benchmark/harness.mjs';
import { createTools } from '../src/tools.mjs';
import { loadCorpus } from '../src/corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { questions } = JSON.parse(readFileSync(resolve(here, '../benchmark/questions.json'), 'utf8'));

/**
 * Everything about the benchmark that does not need the network — which is everything except
 * the API call. Grading in particular has to be right BEFORE the run, because a grader bug
 * turns a paid run into a number nobody can trust.
 */

const q = (id) => questions.find((x) => x.id === id);

test('MCP tool definitions convert to Anthropic ones without losing anything', () => {
    const mcp = Object.entries(createTools(loadCorpus())).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema
    }));
    const converted = toAnthropicTools(mcp);

    assert.equal(converted.length, 5);
    for (const tool of converted) {
        assert.ok(tool.name && tool.description);
        assert.equal(tool.input_schema.type, 'object', 'the schema must survive the rename');
    }
});

test('a right answer is graded right, however it is phrased', () => {
    const selector = questions.find((x) => x.kind === 'selector');
    for (const phrasing of [selector.expect, `\`${selector.expect}\``, `The selector is ${selector.expect}.`]) {
        assert.equal(grade(selector, phrasing).correct, true, phrasing);
    }
});

test('the PrimeNG answer is graded wrong AND recorded as the PrimeNG answer', () => {
    // Counting "gave the PrimeNG answer" separately from "wrong" is the whole point: it
    // distinguishes a model that guessed the old library from one that was merely confused.
    const selector = questions.find((x) => x.kind === 'selector');
    const result = grade(selector, selector.primeNgWrongAnswer);

    assert.equal(result.correct, false);
    assert.equal(result.gaveWrongAnswer, true);
});

test('yes/no is decided by the leading token, not by substring', () => {
    // "no, it is not supported" and "not no — it IS supported" both contain "no".
    const supported = q('Q11');
    assert.equal(supported.expect, 'no');

    assert.equal(grade(supported, 'No, that module is not supported.').correct, true);
    assert.equal(grade(supported, 'Yes, it is supported — no doubt about it.').correct, false);
});

test('a missing answer is wrong, not a crash', () => {
    assert.equal(grade(q('Q01'), null).correct, false);
    assert.equal(grade(q('Q01'), undefined).correct, false);
});

test('summarise counts correct, PrimeNG answers and refusals separately', () => {
    const rows = [
        { correct: true, gaveWrongAnswer: false, refused: false },
        { correct: false, gaveWrongAnswer: true, refused: false },
        { correct: false, gaveWrongAnswer: false, refused: true }
    ];
    assert.deepEqual(summarise(rows), { asked: 3, correct: 1, gavePrimeNgAnswer: 1, refused: 1, errored: 0 });
});

test('an errored question is counted as errored, not as a wrong answer', () => {
    // A run that half-failed on billing or rate limits must not read as a model that got half
    // the answers wrong — that would be the most expensive kind of misleading number.
    const rows = [
        { correct: true, gaveWrongAnswer: false, refused: false },
        { correct: false, gaveWrongAnswer: false, refused: false, error: '400 credit balance too low' }
    ];
    const s = summarise(rows);

    assert.equal(s.errored, 1);
    assert.equal(s.gavePrimeNgAnswer, 0, 'an API error is not the model reaching for PrimeNG');
});

test('the answer schema is shaped the way structured outputs require', () => {
    assert.equal(ANSWER_SCHEMA.additionalProperties, false, 'structured outputs require this');
    assert.deepEqual(ANSWER_SCHEMA.required, ['answer']);
});

test('the harness sends no sampling parameters — Opus 5 rejects them', () => {
    // temperature/top_p/top_k are removed on this model and return a 400. A run that 400s on
    // question 1 wastes nothing, but one that 400s on question 19 wastes 18 questions.
    const source = readFileSync(resolve(here, '../benchmark/run.mjs'), 'utf8');

    assert.doesNotMatch(source, /temperature/, 'temperature is rejected by Opus 5');
    assert.doesNotMatch(source, /top_[pk]/, 'top_p/top_k are rejected by Opus 5');
});

test('the harness checks stop_reason before reading content', () => {
    // A refusal is an HTTP 200 with an empty or partial body. Indexing content[0] first is
    // the documented way to crash on one.
    const source = readFileSync(resolve(here, '../benchmark/run.mjs'), 'utf8');
    assert.match(source, /stop_reason === 'refusal'/);
});

test('the harness does not enable model fallbacks', () => {
    // Enabling them is the right default for production code and the wrong one here: a
    // fallback would answer some questions on a different model, which is the variable under
    // test. Refusals are recorded instead.
    const source = readFileSync(resolve(here, '../benchmark/run.mjs'), 'utf8');
    assert.doesNotMatch(source, /fallbacks/);
});

test('--sample takes one question per kind, not five of the same', () => {
    // `--limit 5` is the obvious cheap probe and a trap: the set is grouped by kind, so the
    // first five are all selector questions. That measures one question type while reading
    // like it measured the benchmark.
    const sample = sampleOnePerKind(questions);
    // Derived from the set, not typed in. This test read `5` until a sixth kind was added, and
    // a hardcoded count turns "the sample covers every kind" into "the sample is five long" —
    // which is exactly the trap the sample exists to avoid, one level up.
    const kinds = new Set(questions.map((q) => q.kind));

    assert.equal(sample.length, kinds.size);
    assert.deepEqual(new Set(sample.map((q) => q.kind)), kinds, 'every kind must be represented exactly once');
    assert.notDeepEqual(sample.map((q) => q.id), questions.slice(0, kinds.size).map((q) => q.id));
});
