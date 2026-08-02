import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { grade } from '../benchmark/harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(here, '../bin/angulux-mcp.mjs');
const QUESTIONS = JSON.parse(readFileSync(resolve(here, '../benchmark/questions.json'), 'utf8')).questions;

/**
 * SUFFICIENCY — every benchmark question is answerable from this server, offline and free.
 *
 * WHAT THIS REPLACES. `benchmark/run.mjs` asks a paid model the same 20 questions twice, with
 * and without these tools, to measure whether the tools reduce hallucination. That measurement
 * needs Anthropic API credit, and it can never be a blocking gate: Opus 5 removed the sampling
 * parameters, so there is no determinism knob (see the header of `harness.mjs`). It stays in the
 * tree as an opt-in tool.
 *
 * AC-12 was really two questions wearing one coat:
 *
 *   1. Does this server hold, and hand back, the right answer?   <- measurable here, for free
 *   2. Do models actually consult it instead of guessing?        <- needs the paid run
 *
 * This suite settles (1) deterministically, and it does something the paid benchmark never
 * could: it catches regressions forever. If the library moves and a tool starts handing back
 * the wrong selector, this goes red in CI.
 *
 * WHAT IT DOES NOT PROVE — and no document in this repo may claim otherwise. It says nothing
 * about model behaviour. It proves the data source is sufficient, not that an assistant chooses
 * to use it. The honest claim is narrower than "assistants hallucinate less with angulux tools":
 * every one of the 20 questions is answerable in at most two tool calls, and the PrimeNG answer
 * is verifiably absent from what the lookup returns — so a model that still answers `p-button`
 * did not look, rather than looked and found nothing.
 *
 * Verdicts go through `grade()`, the SAME function the paid benchmark scores with. A second
 * grading implementation here could drift from it and quietly grade something else.
 */

let client;
let transport;

before(async () => {
    transport = new StdioClientTransport({ command: process.execPath, args: [BIN] });
    client = new Client({ name: 'angulux-mcp-sufficiency', version: '1' }, { capabilities: {} });
    await client.connect(transport);
});

after(async () => {
    await client?.close();
});

/**
 * A call counter scoped to one question, so "answerable in <= 2 calls" is measured rather than
 * asserted from the shape of the code. Returns both the parsed payload and its raw text: the
 * absence check has to run against the bytes on the wire, not a re-serialised object.
 */
function session() {
    const state = { calls: 0, texts: [] };

    const call = async (name, args = {}) => {
        state.calls += 1;
        const result = await client.callTool({ name, arguments: args });
        assert.notEqual(result.isError, true, `${name} errored: ${JSON.stringify(result.content)}`);
        const text = result.content?.find((block) => block.type === 'text')?.text;
        assert.ok(text, `${name} returned no text block`);
        state.texts.push(text);
        return JSON.parse(text);
    };

    return { state, call };
}

/**
 * How a client answers each kind of question through the tools — one lookup per kind.
 *
 * These deliberately mirror `questions.test.mjs`'s DERIVE map, which reads the same facts
 * straight off the corpus. The pair is the point: DERIVE proves the corpus holds the answer,
 * these prove it survives the trip through a tool. A bug that only exists in the tool layer is
 * invisible to DERIVE, and vice versa.
 */
const LOOKUP = {
    selector: async (q, call) => {
        const payload = await call('get_module', { name: q.module, summary: true });
        assert.equal(payload.found, true, `${q.module} not found`);
        return payload.module.declarations.find((d) => d.kind === 'component')?.selector;
    },

    entrypoint: async (q, call) => {
        const payload = await call('list_modules', {});
        return payload.modules.find((m) => m.name === q.module)?.entrypoint;
    },

    supported: async (q, call) => {
        const payload = await call('get_module', { name: q.module });
        // A refusal must explain itself. "found: false" alone would let a model conclude the
        // server is broken rather than that the module is genuinely unsupported.
        if (payload.found === false) assert.ok(payload.reason?.length > 20, `${q.module}: bare refusal`);
        return payload.found ? 'yes' : 'no';
    },

    deprecated: async (q, call) => {
        const payload = await call('get_module', { name: q.module, declaration: q.declaration });
        assert.equal(payload.found, true, `${q.module}/${q.declaration} not found`);
        const input = payload.module.declarations[0].inputs.find((i) => i.name === q.member);
        return input?.deprecated ? 'yes' : 'no';
    },

    inputExists: async (q, call) => {
        const payload = await call('get_module', { name: q.module, declaration: q.declaration });
        assert.equal(payload.found, true, `${q.module}/${q.declaration} not found`);
        return payload.module.declarations[0].inputs.some((i) => i.name === q.member) ? 'yes' : 'no';
    },

    slot: async (q, call) => {
        const payload = await call('get_module', { name: q.module, declaration: q.declaration });
        assert.equal(payload.found, true, `${q.module}/${q.declaration} not found`);
        const slot = payload.module.declarations[0].slots.find((s) => s.field === q.member);
        return slot ? `#${slot.name}` : null;
    }
};

/**
 * The correction path: given the WRONG answer, does `check_usage` reject it and name the right
 * one? This is the tool that exists specifically to catch a model about to write PrimeNG.
 *
 * `inputExists` with expect "yes" is absent on purpose. `check_usage` reports deprecation as a
 * problem too, so an input that exists but is deprecated correctly comes back `ok: false` —
 * asserting `ok: true` there would encode "exists" as "clean" and go red for the right reason.
 */
const CORRECTION = {
    selector: (q) => ({ args: { selector: q.primeNgWrongAnswer }, mentions: q.expect }),
    entrypoint: (q) => ({ args: { entrypoint: q.primeNgWrongAnswer }, mentions: q.expect }),
    supported: (q) => ({ args: { module: q.module }, mentions: 'not in the supported closure' }),
    deprecated: (q) => ({ args: { module: q.module, inputs: [q.member] }, mentions: 'deprecated' }),
    inputExists: (q) =>
        q.expect === 'no' ? { args: { module: q.module, inputs: [q.member] }, mentions: 'is not an input' } : null,
    // The mis-spelling, not the PrimeNG spelling. Both are wrong, but this is the one that
    // costs a debugging session: `#loadingIcon` looks right, compiles, renders nothing, and
    // reports nothing. Being told it "does not exist" would send someone to the component.
    slot: (q) => ({ args: { module: q.module, slots: [q.mistake] }, mentions: q.expect })
};

test('EVERY question is answerable from the tools, in at most two calls', async () => {
    const failures = [];

    for (const q of QUESTIONS) {
        const { state, call } = session();
        const answer = await LOOKUP[q.kind](q, call);
        const verdict = grade(q, answer ?? null);

        if (!verdict.correct) failures.push(`${q.id} (${q.kind}): tools said "${answer}", expected "${q.expect}"`);
        assert.ok(state.calls <= 2, `${q.id} needed ${state.calls} tool calls`);
    }

    assert.deepEqual(failures, [], 'the server cannot answer questions it is supposed to answer');
});

test('the PrimeNG answer never appears in what the lookup hands back', async () => {
    // Only where the wrong answer is a concrete identifier. For yes/no questions the "wrong
    // answer" is the string "yes", which appears in payloads for unrelated reasons — asserting
    // its absence there would be a test that passes by accident.
    const concrete = QUESTIONS.filter((q) => ['selector', 'entrypoint', 'slot'].includes(q.kind));
    assert.equal(concrete.length, 14, 'expected 14 questions with a concrete wrong answer');

    for (const q of concrete) {
        const { state, call } = session();
        await LOOKUP[q.kind](q, call);

        for (const text of state.texts) {
            assert.ok(
                !text.includes(q.primeNgWrongAnswer),
                `${q.id}: lookup payload contains PrimeNG's "${q.primeNgWrongAnswer}"`
            );
        }
    }
});

test('given the WRONG answer, check_usage rejects it and names the right one', async () => {
    const failures = [];

    for (const q of QUESTIONS) {
        const correction = CORRECTION[q.kind](q);
        if (!correction) continue;

        const { call } = session();
        const payload = await call('check_usage', correction.args);
        const problems = payload.problems.join('\n');

        if (payload.ok !== false) failures.push(`${q.id}: check_usage accepted "${JSON.stringify(correction.args)}"`);
        else if (!problems.includes(correction.mentions))
            failures.push(`${q.id}: rejected but never mentioned "${correction.mentions}" — got: ${problems}`);
    }

    assert.deepEqual(failures, [], 'the correction path does not correct');
});

test('the lookup routes cover every kind in the set, with none left over', () => {
    // Without this, adding a sixth question kind would silently skip it: LOOKUP[q.kind] would
    // be undefined and the loop above would throw somewhere less obvious than here.
    const kinds = [...new Set(QUESTIONS.map((q) => q.kind))].sort();
    assert.deepEqual(kinds, Object.keys(LOOKUP).sort());
    assert.deepEqual(kinds, Object.keys(CORRECTION).sort());
});
