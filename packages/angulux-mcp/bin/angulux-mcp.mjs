#!/usr/bin/env node
/**
 * angulux-mcp — an MCP server answering angulux API questions from the generated corpus.
 *
 * Speaks MCP over stdio, so stdout belongs to the protocol: anything written there that is
 * not a JSON-RPC frame corrupts the stream. Diagnostics go to stderr.
 */

import { startStdioServer } from '../src/server.mjs';

try {
    await startStdioServer();
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
}
