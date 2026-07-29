import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { validateToolResult } from '../src/contract.mjs';
import { loadCorpus } from '../src/corpus.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(here, '../bin/angulux-mcp.mjs');

/**
 * THE LIVE RUNG. Everything else in this package tests functions; this spawns the real
 * binary, drives it with a real MCP client over real stdio, and asserts against the bytes
 * that actually come back.
 *
 * That distinction is not ceremony. A handler can return a perfectly correct object and still
 * fail across the wire — a value that does not serialise, a result envelope the protocol
 * rejects, a tool advertised in `tools/list` that has no handler behind it. None of those are
 * visible to a test that imports the module and calls the function.
 *
 * The tool list is read from the SERVER, never hardcoded here, so a tool that is advertised
 * but not callable fails rather than being quietly skipped.
 */

let client;
let transport;
let advertised;

before(async () => {
    transport = new StdioClientTransport({ command: process.execPath, args: [BIN] });
    client = new Client({ name: 'angulux-mcp-wire-probe', version: '1' }, { capabilities: {} });
    await client.connect(transport);
    advertised = (await client.listTools()).tools;
});

after(async () => {
    await client?.close();
});

/** Call a tool and return the parsed JSON payload from its text content block. */
async function callAndParse(name, args = {}) {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, `${name} returned an error: ${JSON.stringify(result.content)}`);

    const text = result.content?.find((block) => block.type === 'text')?.text;
    assert.ok(text, `${name} returned no text block`);
    return JSON.parse(text);
}

const ARGUMENTS = {
    list_modules: {},
    get_module: { name: 'button' },
    search_api: { query: 'size' },
    check_usage: { selector: 'p-button' },
    corpus_info: {}
};

test('the server advertises its tools with descriptions and input schemas', () => {
    assert.equal(advertised.length, 5);
    for (const tool of advertised) {
        assert.ok(tool.description?.length > 20, `${tool.name} needs an actionable description`);
        assert.equal(tool.inputSchema?.type, 'object', `${tool.name} must advertise an object input schema`);
    }
});

test('EVERY advertised tool is callable, and its real payload satisfies the contract', async () => {
    // Reading the list from the server is the point: hardcoding five names here would let an
    // advertised-but-broken sixth tool pass unnoticed.
    for (const tool of advertised) {
        const args = ARGUMENTS[tool.name];
        assert.ok(args !== undefined, `no probe arguments for advertised tool "${tool.name}"`);

        const payload = await callAndParse(tool.name, args);
        assert.deepEqual(validateToolResult(tool.name, payload), [], `${tool.name} violated its contract on the wire`);
    }
});

test('the thesis holds across the wire, not just in-process', async () => {
    const payload = await callAndParse('check_usage', { selector: 'p-button' });

    assert.equal(payload.ok, false);
    assert.match(payload.problems.join('\n'), /agl-button/);
});

test('provenance over the wire matches the corpus on disk', async () => {
    const payload = await callAndParse('corpus_info');
    const corpus = loadCorpus();

    assert.equal(payload.sourceHash, corpus.sourceHash);
    assert.equal(payload.libraryVersion, corpus.libraryVersion);
    assert.equal(payload.closureCount, 64);
});

test('a module record survives serialisation intact, nested arrays and all', async () => {
    // The shape most likely to be mangled in transit: 4 declarations, each with nested input
    // and output arrays. An in-process test would never notice if this flattened.
    const payload = await callAndParse('get_module', { name: 'button' });

    assert.equal(payload.found, true);
    assert.ok(payload.module.declarations.length >= 4);
    const button = payload.module.declarations.find((d) => d.name === 'Button');
    assert.equal(button.selector, 'agl-button');
    assert.ok(button.inputs.length > 0 && button.outputs.length > 0);
});

test('an unknown tool is refused over the wire, not silently empty', async () => {
    const result = await client.callTool({ name: 'get_component', arguments: {} });
    assert.equal(result.isError, true);
});
