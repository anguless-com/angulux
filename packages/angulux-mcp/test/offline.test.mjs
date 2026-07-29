import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { validateToolResult } from '../src/contract.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(here, '../bin/angulux-mcp.mjs');
const GUARD = pathToFileURL(resolve(here, 'no-network-guard.mjs')).href;

/**
 * AC-9: the server answers with no network access.
 *
 * "It only reads a local file" is a claim. Here the process is started with every outbound
 * primitive — fetch, http, https, net, tls, dns — replaced by a stub that throws and names
 * itself. If the server or anything it imports reaches for the network while serving, the
 * call fails loudly instead of quietly succeeding on a machine that happens to be online.
 *
 * The static check below is the complement: it pins WHICH parts of the MCP SDK we import,
 * because the SDK does ship HTTP and SSE transports and importing one by accident would put
 * a network path back into the server.
 */

let client;

before(async () => {
    client = new Client({ name: 'angulux-mcp-offline-probe', version: '1' }, { capabilities: {} });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ['--import', GUARD, BIN] }));
});

after(async () => {
    await client?.close();
});

const ARGUMENTS = {
    list_modules: {},
    get_module: { name: 'button' },
    search_api: { query: 'size' },
    check_usage: { selector: 'p-button' },
    corpus_info: {}
};

test('every tool answers correctly with the network removed', async () => {
    const advertised = (await client.listTools()).tools;
    assert.equal(advertised.length, 5);

    for (const tool of advertised) {
        const result = await client.callTool({ name: tool.name, arguments: ARGUMENTS[tool.name] });
        assert.notEqual(result.isError, true, `${tool.name} failed offline: ${JSON.stringify(result.content)}`);

        const payload = JSON.parse(result.content.find((b) => b.type === 'text').text);
        assert.deepEqual(validateToolResult(tool.name, payload), [], `${tool.name} violated its contract offline`);
    }
});

test('the server imports only the SDK stdio transport, never an HTTP or SSE one', () => {
    // The SDK ships streamable-HTTP and SSE transports. Importing one would put a network
    // path back into a server whose entire input is a local file.
    for (const file of readdirSync(resolve(here, '../src'))) {
        const source = readFileSync(resolve(here, '../src', file), 'utf8');

        assert.doesNotMatch(source, /sdk\/server\/(sse|streamableHttp)/i, `${file} imports a network transport`);
        assert.doesNotMatch(source, /\bfetch\s*\(/, `${file} calls fetch`);
        assert.doesNotMatch(source, /node:https?/, `${file} imports an http client`);
        assert.doesNotMatch(source, /node:net\b/, `${file} opens a socket`);
        assert.doesNotMatch(source, /node:child_process/, `${file} spawns a subprocess`);
    }
});
