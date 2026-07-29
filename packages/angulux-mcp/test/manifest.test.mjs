import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const pkg = JSON.parse(readFileSync(resolve(here, '../package.json'), 'utf8'));

/**
 * The owner's publish decision, expressed as tests rather than as a promise.
 *
 * 2026-07-29: build the MCP server now, publish it later — revisit at the Angular 23 RC
 * window. "We'll remember not to publish it" is the kind of intention that survives until
 * someone runs a release script, so `private: true` makes `npm publish` refuse outright and
 * these assertions make a silent flip to `false` fail the suite.
 */

test('the package is private — publishing is a later decision, not an accident', () => {
    assert.equal(pkg.private, true);
});

test('it is absent from the publishable set, so no gate ever packs it', () => {
    const gate = readFileSync(resolve(repoRoot, 'tools/check-publishable.mjs'), 'utf8');
    assert.doesNotMatch(gate, /angulux-mcp/, 'check-publishable lists a package that must not be published');
});

test('an outward-facing tool carries a bare name, not the @anguless scope', () => {
    // Precedent: angulux-license-guard, angulux-migrate. The scope is for the library and
    // its runtime forks; tools aimed at people who have never heard of the org are bare.
    assert.equal(pkg.name, 'angulux-mcp');
});

test('every dependency is pinned exactly or through the gated catalog', () => {
    // Constitution P4. A caret here is the drift that one careless update turns into a
    // different package — and `catalog:` is the form check:catalog can actually see.
    for (const [name, spec] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
        assert.match(spec, /^(catalog:|\d+\.\d+\.\d+)/, `${name}: "${spec}" is neither exact nor catalog:`);
    }
});

test('the MCP SDK pin lives in the catalog, where a gate watches it', () => {
    const ws = readFileSync(resolve(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
    assert.match(ws, /'@modelcontextprotocol\/sdk':\s*\d+\.\d+\.\d+/, 'SDK missing or unpinned in the catalog');
    assert.equal(pkg.dependencies['@modelcontextprotocol/sdk'], 'catalog:');
});
