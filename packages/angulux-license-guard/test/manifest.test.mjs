import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8'));

test('published under the unscoped name the owner chose', () => {
    assert.equal(pkg.name, 'angulux-license-guard');
    assert.equal(pkg.version, '1.0.0');
});

test('MIT and public — the licence claim is the product', () => {
    assert.equal(pkg.license, 'MIT');
    assert.equal(pkg.publishConfig?.access, 'public');
    assert.notEqual(pkg.private, true);
});

test('exposes a CLI', () => {
    assert.ok(pkg.bin, 'no bin entry');
    assert.ok(Object.keys(pkg.bin).length > 0);
});

test('ships an explicit file allowlist', () => {
    assert.ok(Array.isArray(pkg.files) && pkg.files.length > 0);
});

test('declares ZERO runtime dependencies', () => {
    // A tool that exists to prove a licence claim must not drag in a supply chain
    // of its own. Absent is preferred over empty; both are acceptable, anything
    // else is not.
    const deps = pkg.dependencies ?? {};
    assert.deepEqual(Object.keys(deps), [], 'runtime dependencies are not allowed here');
});

test('repository is set so the npm page is not blank', () => {
    assert.ok(pkg.repository?.url);
});
