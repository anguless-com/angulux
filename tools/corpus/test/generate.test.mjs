import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCorpus, serialise } from '../generate.mjs';
import { validateCorpus } from '../contract.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const closure = JSON.parse(readFileSync(resolve(repoRoot, 'tools/scope/closure.json'), 'utf8')).closure;

test('the corpus describes exactly the warranted closure — both directions', () => {
    // A count would pass while one module was swapped for another. Set equality is the
    // question worth asking: a missing module and an invented one must both fail, and the
    // 53 attic modules must not appear at all.
    const names = buildCorpus().modules.map((m) => m.name);

    assert.deepEqual([...names].sort(), [...closure].sort());
    assert.equal(new Set(names).size, names.length, 'a module is listed twice');
});

test('the generated corpus satisfies its own contract', () => {
    assert.deepEqual(validateCorpus(buildCorpus()), []);
});

test('generation is deterministic — same input, identical bytes', () => {
    // This is the property T6's drift gate rests on. If two runs on an unchanged tree can
    // differ, the gate reports drift that is not there and gets switched off within a week.
    assert.equal(serialise(buildCorpus()), serialise(buildCorpus()));
});

test('the serialised corpus is LF-only', () => {
    // The tree is CRLF on Windows and LF on the Linux runner. A corpus that picked up the
    // platform's line ending could never be byte-identical on both.
    assert.doesNotMatch(serialise(buildCorpus()), /\r/);
});

test('provenance is a content hash, not a commit SHA', () => {
    // A HEAD SHA would change on every commit, so the byte-match gate would fail on all of
    // them — the field would manufacture drift rather than detect it. A hash of the files
    // that actually fed the corpus changes exactly when the corpus should.
    const { generator } = buildCorpus();

    assert.match(generator.sourceHash, /^[0-9a-f]{64}$/);
    assert.equal(generator.closureCount, closure.length);
    assert.equal(generator.closureCount, 64);
});

test('a module that declares nothing is still present', () => {
    const empty = buildCorpus().modules.filter((m) => m.declarations.length === 0);

    assert.ok(empty.length > 0, 'infrastructure modules declare nothing and must still appear');
    assert.ok(empty.every((m) => closure.includes(m.name)));
});

test('every module carries the entrypoint a consumer would actually import', () => {
    for (const module of buildCorpus().modules) {
        assert.equal(module.entrypoint, `angulux/${module.name}`);
    }
});
