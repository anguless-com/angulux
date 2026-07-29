import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCorpus } from '../src/corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const committed = JSON.parse(readFileSync(resolve(repoRoot, 'corpus/corpus.json'), 'utf8'));

const withTempCorpus = (contents, run) => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-corpus-'));
    try {
        if (contents !== undefined) writeFileSync(join(dir, 'corpus.json'), contents);
        run(join(dir, 'corpus.json'));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
};

test('it loads the committed corpus and reports what it loaded', () => {
    const corpus = loadCorpus();

    assert.equal(corpus.moduleCount, 64);
    assert.equal(corpus.sourceHash, committed.generator.sourceHash);
    assert.equal(corpus.closureCount, committed.generator.closureCount);
    assert.equal(corpus.modules.length, 64);
});

test('the library version comes from the ROOT manifest, not the generated one', () => {
    // packages/angulux/package.json is overwritten by every build; reading it would work
    // today and silently report a stale or half-written value later.
    const root = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
    assert.equal(loadCorpus().libraryVersion, root.version);
});

test('a missing corpus is refused, and the message says where it looked', () => {
    withTempCorpus(undefined, (path) => {
        assert.throws(() => loadCorpus(path), (error) => {
            assert.match(error.message, /corpus/i);
            assert.ok(error.message.includes(path), 'the error must name the path it tried');
            return true;
        });
    });
});

test('unparseable JSON is refused as such, not as a mystery', () => {
    withTempCorpus('{ this is not json', (path) => {
        assert.throws(() => loadCorpus(path), /JSON/i);
    });
});

test('a corpus that violates its own contract is refused, naming the violation', () => {
    // Serving a structurally broken corpus would answer questions from garbage. Better to
    // refuse to start: a server that will not boot is debuggable, one that lies is not.
    const broken = JSON.parse(JSON.stringify(committed));
    broken.generator.sourceHash = 'not-a-digest';
    withTempCorpus(JSON.stringify(broken), (path) => {
        assert.throws(() => loadCorpus(path), /sourceHash/);
    });
});

test('lookup by module name is exact — and misses are misses', () => {
    const corpus = loadCorpus();

    assert.equal(corpus.moduleByName('button').name, 'button');
    assert.equal(corpus.moduleByName('accordion'), undefined, 'accordion is in the attic, not the closure');
    assert.equal(corpus.moduleByName('Button'), undefined, 'lookup must not be case-insensitive by accident');
});

test('the loader cannot reach the network or shell out', () => {
    // "It reads a local file" is a claim until something checks it. The corpus is the only
    // input this server is allowed to have.
    const source = readFileSync(resolve(here, '../src/corpus.mjs'), 'utf8');

    assert.doesNotMatch(source, /\bfetch\s*\(/, 'corpus.mjs calls fetch');
    assert.doesNotMatch(source, /node:https?/, 'corpus.mjs imports an http client');
    assert.doesNotMatch(source, /node:child_process/, 'corpus.mjs spawns a subprocess');
    assert.doesNotMatch(source, /node:net/, 'corpus.mjs opens a socket');
});
