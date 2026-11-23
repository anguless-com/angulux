import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compare, findWaits, prune } from '../lib/spec-waits.mjs';
import { main } from '../check-spec-waits.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The gate that keeps fixed-duration waits from growing back into the spec suite (#124).
 * What matters is the line between a sleep and everything that only looks like one: a gate
 * that reports a correct test stops being read, and one that misses a spelling is decoration.
 */

const count = (body) => findWaits(`it('x', async () => {\n${body}\n});`).length;

test('every spelling of a sleep is counted', () => {
    assert.equal(count('await new Promise((resolve) => setTimeout(resolve, 100));'), 1);
    assert.equal(count('await new Promise((r) => setTimeout(r, 10));'), 1);
    assert.equal(count('await new Promise<void>((done) => window.setTimeout(done, 1));'), 1);
    assert.equal(count('await new Promise((resolve) => setTimeout(() => resolve(), 50));'), 1);
    assert.equal(count('await new Promise((resolve) => { setTimeout(() => { resolve(); }, 50); });'), 1);
    assert.equal(count('await new Promise(function (resolve) { setTimeout(resolve, 50); });'), 1);
    assert.equal(count('await new Promise((resolve) => setTimeout(resolve, table.filterDelay + 10));'), 1, 'a duration that is an expression is still a duration');
    assert.equal(count('const sleep = () => new Promise((r) => setTimeout(r, 100));'), 1, 'a wait is counted where it is written, awaited or not');
});

test('what only looks like a sleep is not counted', () => {
    assert.equal(count('await new Promise((resolve) => setTimeout(resolve, 0));'), 0, 'one macrotask does not get longer under load');
    assert.equal(count('await new Promise((resolve) => setTimeout(resolve));'), 0);
    assert.equal(count("const late = new Promise((resolve) => { setTimeout(() => { resolve(['a']); }, 100); });"), 0, 'late data is what a test waits for, not the wait');
    assert.equal(count('setTimeout(() => { host.options = []; }, 100);'), 0);
    assert.equal(count('await new Promise((resolve) => requestAnimationFrame(() => resolve()));'), 0);
    assert.equal(count('await new Promise((resolve) => { sub.unsubscribe(); setTimeout(resolve, 100); });'), 0, 'an executor that does other work is not a bare sleep');
    assert.equal(count('// await new Promise((resolve) => setTimeout(resolve, 100));'), 0, 'a comment is not code');
    assert.equal(count("const s = 'new Promise((resolve) => setTimeout(resolve, 100))';"), 0, 'a string is not code');
});

test('a finding names its line', () => {
    const [wait] = findWaits('\n\nawait new Promise((resolve) => setTimeout(resolve, 100));\n');
    assert.equal(wait.line, 3);
});

test('more than the allowance is over, a file the baseline has never seen is allowed none', () => {
    const { over, under } = compare({ 'a.spec.ts': 2 }, { 'a.spec.ts': 3, 'new.spec.ts': 1 });
    assert.deepEqual(over, [
        { file: 'a.spec.ts', found: 3, allowed: 2 },
        { file: 'new.spec.ts', found: 1, allowed: 0 }
    ]);
    assert.deepEqual(under, []);
});

test('fewer than the allowance is stale, and prune can only give allowance back', () => {
    const baseline = { 'a.spec.ts': 5, 'gone.spec.ts': 2, 'same.spec.ts': 1 };
    const found = { 'a.spec.ts': 3, 'same.spec.ts': 1, 'new.spec.ts': 4 };

    assert.deepEqual(compare(baseline, found).under, [
        { file: 'a.spec.ts', found: 3, allowed: 5 },
        { file: 'gone.spec.ts', found: 0, allowed: 2 }
    ]);
    assert.deepEqual(prune(baseline, found), { 'a.spec.ts': 3, 'same.spec.ts': 1 }, 'a file with waits the baseline never held is not added');
    assert.deepEqual(prune({ 'a.spec.ts': 1 }, { 'a.spec.ts': 9 }), { 'a.spec.ts': 1 }, 'a number is never raised');
});

test('the real tree is clean against the committed baseline, and the attic is not in it', () => {
    assert.equal(main([]), 0);
    const { files } = JSON.parse(readFileSync(join(repoRoot, 'tools/spec-waits-baseline.json'), 'utf8'));
    // The baseline reached zero on 2026-11-23 (issue #124), so it may be empty. What keeps the gate
    // from passing on nothing is that it refuses a tree with no spec files, not this file's size.
    assert.equal(typeof files, 'object');
    assert.equal(Object.keys(files).filter((f) => /(^|\/)attic\//.test(f)).length, 0);
});
