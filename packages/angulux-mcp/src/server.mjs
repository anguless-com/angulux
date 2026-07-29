/**
 * server — the five tools, exposed over MCP.
 *
 * WHY THE LOW-LEVEL `Server` AND NOT `McpServer.registerTool`.
 *
 * `registerTool` types its `inputSchema` as `ZodRawShapeCompat | AnySchema`, and the SDK
 * ships separate `./validation/ajv` and `./validation/cfworker` entry points — so the
 * JSON-Schema path may want a validator adapter wired up. We have no Zod, and adding `ajv`
 * would mean a new exactly-pinned dependency (constitution P4) to buy something we do not
 * need: our tools already carry hand-written JSON Schema, and the low-level server hands it
 * to the client verbatim. Fewer moving parts, one less thing to pin.
 *
 * Results are returned as a single JSON text block. Every payload is validated against the
 * tool contract on the way out, so a malformed result fails HERE — at the boundary, with the
 * tool named — rather than arriving at an assistant as plausible-looking JSON.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { loadCorpus } from './corpus.mjs';
import { createTools } from './tools.mjs';
import { validateToolResult } from './contract.mjs';

export const SERVER_NAME = 'angulux-mcp';

export function createServer(corpus = loadCorpus()) {
    const tools = createTools(corpus);

    const server = new Server(
        { name: SERVER_NAME, version: corpus.libraryVersion },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, () => ({
        tools: Object.entries(tools).map(([name, tool]) => ({
            name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }))
    }));

    server.setRequestHandler(CallToolRequestSchema, (request) => {
        const name = request.params.name;
        const tool = tools[name];

        if (!tool) {
            // An unknown tool is an error, not an empty answer. A caller that asked for
            // something this server does not have must find that out.
            return {
                isError: true,
                content: [{ type: 'text', text: `angulux-mcp has no tool named "${name}".` }]
            };
        }

        let payload;
        try {
            payload = tool.handler(request.params.arguments ?? {});
        } catch (error) {
            return { isError: true, content: [{ type: 'text', text: `${name} failed: ${error.message}` }] };
        }

        const problems = validateToolResult(name, payload);
        if (problems.length) {
            // Refuse to emit a payload that violates the contract. Shipping it would put
            // malformed-but-plausible JSON in front of a model, which is worse than an error.
            return {
                isError: true,
                content: [{ type: 'text', text: `${name} produced a contract violation:\n- ${problems.join('\n- ')}` }]
            };
        }

        return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
    });

    return server;
}

export async function startStdioServer() {
    // loadCorpus throws with a specific message if the corpus is missing or invalid; letting
    // it propagate means the process exits loudly instead of serving nothing.
    const server = createServer();
    await server.connect(new StdioServerTransport());
    return server;
}
