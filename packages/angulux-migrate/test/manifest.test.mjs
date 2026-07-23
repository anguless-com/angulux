import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8'));

test('published unscoped so `npx angulux-migrate` reads as one thing', () => {
    assert.equal(pkg.name, 'angulux-migrate');
    assert.equal(pkg.license, 'MIT');
    assert.equal(pkg.publishConfig?.access, 'public');
});

test('exposes the CLI under the name people will type', () => {
    assert.ok(pkg.bin?.['angulux-migrate'], 'bin must be keyed angulux-migrate');
});

test('ships an explicit file allowlist', () => {
    assert.ok(Array.isArray(pkg.files) && pkg.files.length > 0);
});

test('declares ZERO runtime dependencies', () => {
    // Same reasoning as the licence guard: a tool people run with npx against their own
    // source tree should not arrive with a supply chain attached.
    assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
});

test('repository is set so the npm page is not blank', () => {
    assert.ok(pkg.repository?.url);
});
