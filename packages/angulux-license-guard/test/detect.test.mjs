import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect } from '../src/detect.mjs';

const names = (r) => r.violations.map((v) => v.name).sort();

test('a tree with no PrimeTek package is clean', () => {
    const r = detect([
        { name: 'lodash', version: '4.17.21' },
        { name: '@angular/core', version: '22.0.8' }
    ]);
    assert.deepEqual(r.violations, []);
    assert.deepEqual(r.seen, []);
});

test('an MIT-era PrimeTek version is clean and reported as seen', () => {
    const r = detect([{ name: 'primeng', version: '21.1.9' }]);
    assert.deepEqual(r.violations, []);
    assert.deepEqual(r.seen, [{ name: 'primeng', version: '21.1.9' }]);
});

test('a version at the boundary is a violation — the boundary is inclusive', () => {
    const r = detect([{ name: 'primeng', version: '22.0.0' }]);
    assert.deepEqual(names(r), ['primeng']);
});

test('a version above the boundary is a violation', () => {
    const r = detect([{ name: 'primeng', version: '23.4.1' }]);
    assert.deepEqual(names(r), ['primeng']);
});

test('a prerelease just under the boundary is still clean', () => {
    // 22.0.0-rc.1 precedes 22.0.0 in semver, but the licence changed AT 22.0.0. Comparing
    // on the release triple keeps an rc of the commercial major from being waved through.
    const r = detect([{ name: 'primeng', version: '22.0.0-rc.1' }]);
    assert.deepEqual(names(r), ['primeng'], 'an rc of a commercial major must not pass');
});

test('packages that are commercial in every version always violate', () => {
    const r = detect([
        { name: '@primeui/license-manager', version: '1.0.0' },
        { name: '@primeicons/angular', version: '0.0.1' }
    ]);
    assert.deepEqual(names(r), ['@primeicons/angular', '@primeui/license-manager']);
});

test('a version that is not semver is unverifiable, not safe', () => {
    // Installing from a tarball URL, a git ref or file: is the easiest way to move a
    // commercial build past a guard that only knows how to compare numbers.
    const r = detect([
        { name: 'primeng', version: null, raw: 'https://example.com/primeng-22.0.0.tgz' }
    ]);
    assert.equal(r.violations.length, 1);
    assert.match(r.violations[0].reason, /could not be verified|not a semver/i);
});

test('each violation states which package and why', () => {
    const r = detect([{ name: 'primevue', version: '5.1.0' }]);
    assert.equal(r.violations[0].name, 'primevue');
    assert.equal(r.violations[0].version, '5.1.0');
    assert.ok(r.violations[0].reason.length > 0);
});
