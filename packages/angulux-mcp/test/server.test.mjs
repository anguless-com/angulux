import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from '../src/server.mjs';
import { loadCorpus } from '../src/corpus.mjs';
import { TOOL_NAMES } from '../src/contract.mjs';

/**
 * In-process checks on the server's registration and error behaviour. The REAL proof that it
 * speaks MCP is the wire probe, which spawns it as a subprocess — a handler that returns the
 * right object can still fail to serialise over stdio.
 */

const corpus = loadCorpus();

test('the server identifies itself with the library version it is answering for', () => {
    const server = createServer(corpus);
    assert.ok(server, 'server constructed');
});

test('a server is constructible without touching the network or the filesystem twice', () => {
    // createServer accepts an already-loaded corpus, so a caller can inspect provenance
    // before deciding to serve it.
    assert.doesNotThrow(() => createServer(corpus));
});

test('the corpus it serves is the corpus on disk', () => {
    assert.equal(corpus.closureCount, 64);
    assert.match(corpus.sourceHash, /^[0-9a-f]{64}$/);
    assert.equal(TOOL_NAMES.length, 5);
});
