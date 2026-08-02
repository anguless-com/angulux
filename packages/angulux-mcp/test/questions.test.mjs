import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCorpus } from '../src/corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const set = JSON.parse(readFileSync(resolve(here, '../benchmark/questions.json'), 'utf8'));
const corpus = loadCorpus();

/**
 * The benchmark's expected answers are re-derived from the corpus here, on every run.
 *
 * A fixed question set is what makes runs comparable over time, but a fixed set with
 * hand-typed expectations rots: the library moves, the answers do not, and the benchmark goes
 * on reporting a number that measures nothing. Re-deriving means a library change turns this
 * suite RED and someone updates the set deliberately.
 *
 * This is the same anti-circular rule that caught the entrypoint bug in R0 — an expectation
 * written from the same assumption as the code it checks proves only that someone was
 * consistent.
 */

const declarationOf = (module, name) => corpus.moduleByName(module)?.declarations.find((d) => d.name === name);
const inputOf = (module, declaration, member) =>
    declarationOf(module, declaration)?.inputs.find((i) => i.name === member);

const DERIVE = {
    selector: (q) => corpus.moduleByName(q.module).declarations.find((d) => d.kind === 'component').selector,
    entrypoint: (q) => corpus.moduleByName(q.module).entrypoint,
    supported: (q) => (corpus.moduleByName(q.module) ? 'yes' : 'no'),
    deprecated: (q) => (inputOf(q.module, q.declaration, q.member)?.deprecated ? 'yes' : 'no'),
    inputExists: (q) => (inputOf(q.module, q.declaration, q.member) ? 'yes' : 'no'),
    // Keyed on the FIELD, resolved to the reference name. Those are the two halves nobody can
    // derive from each other — `_closeiconTemplate` reads `#closeicon` — so a question that
    // hardcoded either one would stop measuring the day a module renamed the other.
    slot: (q) => `#${declarationOf(q.module, q.declaration)?.slots.find((s) => s.field === q.member)?.name}`
};

test('the set is exactly 24 questions with unique ids', () => {
    assert.equal(set.count, 24);
    assert.equal(set.questions.length, 24);
    assert.equal(new Set(set.questions.map((q) => q.id)).size, 24);
});

test('EVERY expected answer still matches the corpus', () => {
    const drifted = [];
    for (const q of set.questions) {
        const derived = DERIVE[q.kind](q);
        if (derived !== q.expect) drifted.push(`${q.id} (${q.kind}): expects "${q.expect}", corpus says "${derived}"`);
    }
    assert.deepEqual(drifted, [], 'the question set has drifted from the library it measures');
});

test('every question carries a wrong answer, and it is genuinely wrong', () => {
    // Without this the benchmark cannot distinguish "the model knew" from "the model guessed
    // something that happened to be right".
    for (const q of set.questions) {
        assert.ok(q.primeNgWrongAnswer, `${q.id} has no recorded wrong answer`);
        assert.notEqual(q.primeNgWrongAnswer, q.expect, `${q.id}: the wrong answer equals the right one`);
    }
});

test('the unsupported-module questions really are unsupported', () => {
    const unsupported = set.questions.filter((q) => q.kind === 'supported');
    assert.equal(unsupported.length, 4);
    for (const q of unsupported) {
        assert.equal(corpus.moduleByName(q.module), undefined, `${q.module} is in the closure after all`);
    }
});

test('the set is not all one kind — a single trick would not be evidence', () => {
    const kinds = new Set(set.questions.map((q) => q.kind));
    assert.deepEqual([...kinds].sort(), ['deprecated', 'entrypoint', 'inputExists', 'selector', 'slot', 'supported']);
});

test('every slot question carries the mis-spelling that fails silently', () => {
    // `mistake` is what the correction path feeds back in. It has to differ from the answer by
    // CASE only: a slot name that does not match exactly binds to nothing, and Angular reports
    // that the same way it reports success — silence.
    const slots = set.questions.filter((q) => q.kind === 'slot');
    assert.equal(slots.length, 4);

    for (const q of slots) {
        assert.ok(q.mistake, `${q.id} has no recorded mis-spelling`);
        assert.notEqual(`#${q.mistake}`, q.expect, `${q.id}: the mis-spelling is the right answer`);
        assert.equal(`#${q.mistake.toLowerCase()}`, q.expect.toLowerCase(), `${q.id}: the two differ by more than case`);
    }
});

test('"yes" is not always the right answer', () => {
    // A model that answered "yes" to every yes/no question must not score well.
    const yesNo = set.questions.filter((q) => ['yes', 'no'].includes(q.expect));
    assert.ok(yesNo.some((q) => q.expect === 'yes'));
    assert.ok(yesNo.some((q) => q.expect === 'no'));
});

test('the set records which corpus it was derived from', () => {
    assert.match(set.corpusSourceHash, /^[0-9a-f]{64}$/);
    assert.equal(set.corpusSourceHash, corpus.sourceHash, 'question set was derived from a different corpus');
});
