import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compareVersions, staysBelow, upperBound } from '../peer-licence-lib.mjs';
import { FIRST_COMMERCIAL, isPrimeTekPackage } from '../../packages/angulux-license-guard/src/boundary.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = (p) => join(repoRoot, p);

/**
 * The gate that asks the licence question about the CONSUMER's install.
 *
 * `check:license` proves the tree installed here is clean. A consumer never installs that
 * tree — they install the published package and their package manager resolves whatever the
 * RANGE in its manifest admits. Widening `"@primeuix/themes": "^2.0.0"` would make angulux's
 * own manifest the thing that pulls commercially-licensed software onto a stranger's
 * machine, under our name, with nothing here going red.
 */

test('a caret stops exactly where the boundary starts, which is why ^2.0.0 is safe', () => {
    assert.equal(upperBound('^2.0.0'), '3.0.0');
    assert.equal(staysBelow('^2.0.0', '3.0.0'), true, 'the bound is EXCLUSIVE — stopping at 3.0.0 means never reaching it');
    assert.equal(staysBelow('^3.0.0', '3.0.0'), false, 'and a caret ON the boundary admits it');
});

test('the leading-zero caret rule is load-bearing, not a footnote', () => {
    // @primeuix/utils has its boundary at 0.8.0. Treating ^0.7.x like ^7.x would make a
    // range that stops at 0.8.0 look like one that stops at 1.0.0 — safe read as unsafe, or
    // worse the other way round on a neighbouring version.
    assert.equal(upperBound('^0.7.4'), '0.8.0');
    assert.equal(staysBelow('^0.7.4', FIRST_COMMERCIAL['@primeuix/utils']), true);
    assert.equal(staysBelow('^0.8.0', FIRST_COMMERCIAL['@primeuix/utils']), false);
    assert.equal(upperBound('^0.0.3'), '0.0.4');
});

test('tilde and exact versions are provable too', () => {
    assert.equal(upperBound('~2.0.0'), '2.1.0');
    assert.equal(upperBound('2.0.3'), '2.0.4');
    assert.equal(staysBelow('2.0.3', '3.0.0'), true);
});

test('a range shape it cannot reason about is null — never a guess', () => {
    // null is the caller's signal to FAIL. An approximation here would turn the only
    // question this gate asks into an opinion.
    for (const shape of ['^2.0.0 || ^3.0.0', '>=2.0.0', '>2 <4', '*', '2.x', 'latest', '', 'catalog:']) {
        assert.equal(upperBound(shape), null, `${shape} must not be approximated`);
        assert.equal(staysBelow(shape, '3.0.0'), null);
    }
});

test('version comparison is by release, and a prerelease sorts with its release', () => {
    assert.equal(compareVersions('2.0.3', '3.0.0'), -1);
    assert.equal(compareVersions('3.0.0', '3.0.0'), 0);
    assert.equal(compareVersions('22.1.0', '3.0.0'), 1, 'string comparison would get this backwards');
    assert.equal(compareVersions('3.0.0-rc.1', '3.0.0'), 0);
});

test('the matcher it trusts is the one the licence guard already publishes', () => {
    // One definition of "is this PrimeTek's" for the installed tree and the declared range.
    assert.ok(isPrimeTekPackage('@primeuix/themes'));
    assert.ok(isPrimeTekPackage('primeicons'));
    assert.ok(!isPrimeTekPackage('prettier'), 'deliberately narrow — a consumer package named prime-* is not theirs');
});

test('the published peer range is, right now, provably below the boundary', () => {
    // The claim the README makes to a reader deciding whether to adopt this library. It is
    // asserted here so that changing the manifest cannot quietly make the sentence false.
    const manifest = JSON.parse(readFileSync(at('packages/angulux/package.json'), 'utf8'));
    const range = manifest.peerDependencies['@primeuix/themes'];

    assert.equal(staysBelow(range, FIRST_COMMERCIAL['@primeuix/themes']), true, `peer range ${range} must stay below ${FIRST_COMMERCIAL['@primeuix/themes']}`);
    assert.equal(manifest.peerDependenciesMeta['@primeuix/themes'].optional, true, 'the README calls it an optional peer; the manifest has to agree');
});

test('the gate runs green and names every range it proved', () => {
    const out = execFileSync(process.execPath, [at('tools/check-peer-licence.mjs')], { cwd: repoRoot, encoding: 'utf8' });

    assert.match(out, /✓ check-peer-licence: \d+ PrimeTek range\(s\), every one provably below its commercial boundary/);
    assert.match(out, /@primeuix\/themes = "\^2\.0\.0" < 3\.0\.0/);
});
