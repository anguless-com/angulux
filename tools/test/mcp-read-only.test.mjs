import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * `.mcp.json` launches the Angular CLI's MCP server with `--read-only`, and that flag is the
 * only thing between an assistant and the evidence clones.
 *
 * The server discovers workspaces by walking down from the repository root and does not read
 * `.gitignore`, so it finds the two `angular.json` files inside `ref/primeng`. Without the
 * flag it offers `run_target` and `devserver_start`, and one call aimed at either project
 * writes build output into the directory Constitution P2 says is never written to. The
 * reasoning sits in a comment inside `.mcp.json`; a comment does not survive someone tidying
 * the args, and nothing else in the repository reads the file.
 *
 * What this does not claim: that the flag does what the CLI says it does. That was checked by
 * hand when it was added. This only refuses to let it disappear quietly.
 */

/** Every way an `ng mcp` launch can be missing the flag. Pure, so the red cases need no file. */
function problems(config) {
    const found = [];
    const servers = Object.entries(config.mcpServers ?? {});
    const ngMcp = servers.filter(([, s]) => {
        const words = [s.command, ...(s.args ?? [])].map(String);
        return words.includes('mcp') && words.some((w) => /(^|[\\/])ng(\.js)?$/.test(w) || w === '@angular/cli');
    });
    if (!ngMcp.length) found.push('no server launches `ng mcp`: the server was renamed or removed, so this test no longer guards anything');
    for (const [name, s] of ngMcp) {
        if (!(s.args ?? []).includes('--read-only')) found.push(`server "${name}" launches \`ng mcp\` without --read-only`);
    }
    return found;
}

test('the committed .mcp.json launches ng mcp read-only', () => {
    const config = JSON.parse(readFileSync(join(repoRoot, '.mcp.json'), 'utf8'));
    assert.deepEqual(problems(config), []);
});

test('dropping the flag is caught', () => {
    const config = { mcpServers: { 'angular-cli': { command: 'node', args: ['node_modules/@angular/cli/bin/ng.js', 'mcp'] } } };
    assert.equal(problems(config).length, 1);
});

test('a second ng mcp server under another name, or launched through npx, is caught too', () => {
    const config = {
        mcpServers: {
            'angular-cli': { command: 'node', args: ['node_modules/@angular/cli/bin/ng.js', 'mcp', '--read-only'] },
            ng: { command: 'npx', args: ['-y', '@angular/cli', 'mcp'] },
            direct: { command: 'ng', args: ['mcp'] }
        }
    };
    assert.equal(problems(config).length, 2);
});

test('a config with no ng mcp server fails instead of passing on nothing', () => {
    assert.equal(problems({ mcpServers: { angulux: { command: 'node', args: ['packages/angulux-mcp/bin/angulux-mcp.mjs'] } } }).length, 1);
});
