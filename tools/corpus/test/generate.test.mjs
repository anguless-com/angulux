import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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

test('a record shape change must bump the format version — the hash cannot say it', () => {
    // The gap this closes, found the hard way. `sourceHash` digests the library files that fed
    // the corpus, so it moves when the LIBRARY moves. Change the generator instead — teach it
    // to record slots — and every declaration gains a key while the digest stays byte-identical,
    // because not one library file was touched. A consumer caching on the hash alone would go
    // on reading a shape that no longer exists.
    //
    // So the shape is registered per version here. Adding a field without bumping fails on the
    // key comparison; bumping without registering the new shape fails on the lookup. Neither
    // can pass quietly, which is the only reason this is a test rather than a convention.
    const SHAPES = {
        2: ['name', 'kind', 'selector', 'description', 'inputs', 'outputs', 'slots'],
        // 3 adds `extends`. Angular inherits inputs, and `BaseInput` alone publishes ten of
        // them, so `min` and `max` were real on `agl-inputNumber` and absent from the corpus.
        3: ['name', 'kind', 'selector', 'extends', 'description', 'inputs', 'outputs', 'slots']
    };

    const corpus = buildCorpus();
    const expected = SHAPES[corpus.generator.version];
    assert.ok(expected, `format version ${corpus.generator.version} has no registered record shape`);

    for (const module of corpus.modules) {
        for (const declaration of module.declarations) {
            assert.deepEqual(
                Object.keys(declaration).sort(),
                [...expected].sort(),
                `${module.name}/${declaration.name} does not match the shape declared for format ${corpus.generator.version}`
            );
        }
    }
});

test('a module that declares nothing is still present', () => {
    const empty = buildCorpus().modules.filter((m) => m.declarations.length === 0);

    assert.ok(empty.length > 0, 'infrastructure modules declare nothing and must still appear');
    assert.ok(empty.every((m) => closure.includes(m.name)));
});

test('every module carries the entrypoint a consumer would actually import', () => {
    // ANCHORED TO REAL USAGE, not to a constant in this file. The first version of this test
    // asserted `angulux/<module>` because that is what the plan sketched — and it passed,
    // confirming a fiction. The package is scoped, so the real specifier is
    // `@anguless/angulux/<module>`, and publishing the unscoped form would have taught every
    // assistant an import that does not resolve.
    //
    // apps/verify is a real application that compiles against the built library, so its
    // import statements are evidence in a way that a hardcoded string here never is.
    const used = new Set();
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = resolve(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!entry.name.endsWith('.ts')) continue;
            for (const match of readFileSync(full, 'utf8').matchAll(/from '(@anguless\/angulux\/[\w-]+)'/g)) {
                used.add(match[1]);
            }
        }
    };
    walk(resolve(repoRoot, 'apps/verify/src'));

    assert.ok(used.size > 0, 'the verification app imports nothing — this anchor proves nothing');

    const byEntrypoint = new Map(buildCorpus().modules.map((m) => [m.entrypoint, m.name]));
    for (const specifier of used) {
        assert.ok(byEntrypoint.has(specifier), `apps/verify imports ${specifier}, which no corpus module claims`);
    }
});
