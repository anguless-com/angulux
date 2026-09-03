import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { site, auditSite, auditTable } from '../module-counts-lib.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = (p) => join(repoRoot, p);

/**
 * The gate over the project's central claim: "65 of PrimeNG's 117 modules".
 *
 * Promoting one module out of `attic/` made 34 sentences wrong at once while `npm run check`
 * stayed green, because no gate read prose. These tests use fixture strings rather than the
 * real files — a test that edits README.md to prove the gate bites leaves the working tree
 * dirty the moment it fails halfway.
 */

test('a site that agrees with the derived count produces nothing', () => {
    const text = "angulux ships 65 of PrimeNG's 117 modules.";
    assert.deepEqual(auditSite(text, site("ships %N% of PrimeNG's \\d+ modules"), 65, 'shipped'), []);
});

test('a stale count is reported with both numbers, not just a complaint', () => {
    // The message has to name what it found AND what it should be. "Counts are wrong" sends
    // the reader back to the filesystem to work out which direction to move.
    const problems = auditSite("angulux ships 64 of PrimeNG's 117 modules.", site("ships %N% of PrimeNG's \\d+ modules"), 65, 'shipped');
    assert.equal(problems.length, 1);
    assert.match(problems[0], /says 64/);
    assert.match(problems[0], /shipped is 65/);
});

test('drift is caught in BOTH directions, not only when a number falls behind', () => {
    // apps/showcase/src/app.ts and data.ts said "65" while the real count was 64, for weeks,
    // and the iftalabel promotion made them correct by accident. A number that becomes right
    // on its own was never being checked either.
    const tooHigh = auditSite('// spans all 65 routes', site('spans all %N% routes'), 64, 'shipped');
    assert.equal(tooHigh.length, 1, 'a count that runs AHEAD of the truth must fail too');
    assert.match(tooHigh[0], /says 65, but shipped is 64/);
});

test('every occurrence in a file is checked, not just the first', () => {
    // check-gate-count shipped with exactly this hole: a file naming the count twice was
    // checked once, and the second copy was free to say anything at all.
    const text = ['the other 52 are in attic/', 'and again: the other 51 are in attic/'].join('\n');
    const problems = auditSite(text, site('the other %N% are in attic/'), 52, 'attic');
    assert.equal(problems.length, 1);
    assert.match(problems[0], /says 51/);
});

test('a site reworded out of reach FAILS — silence is not a pass', () => {
    // Otherwise the cheapest way to satisfy this gate is to write vaguer prose, which is the
    // opposite of what it exists for.
    const problems = auditSite("most of PrimeNG's modules are carried", site("%N% of PrimeNG's modules are carried"), 52, 'attic');
    assert.equal(problems.length, 1);
    assert.match(problems[0], /uncheckable/);
});

test('spelled-out numbers are deliberately NOT accepted here', () => {
    // check-gate-count reads words because its count is small. These counts are past twenty,
    // where its word list stops on purpose — and refusing words also avoids the trap that gate
    // records against itself, where `eight` matches inside `eighteen`.
    const problems = auditSite('ships sixty-five modules', site('ships %N% modules'), 65, 'shipped');
    assert.equal(problems.length, 1);
    assert.match(problems[0], /uncheckable/, 'a spelled-out count must be reported, never silently skipped');
});

test('a neighbouring number in the same sentence is not mistaken for the one being checked', () => {
    // "65 of 117" holds two counts. The template pins which is which by matching the other as
    // a bare \d+; getting this wrong would report the upstream total against the shipped fact.
    const text = "It ships 65 of PrimeNG's 117 modules.";
    assert.deepEqual(auditSite(text, site("ships %N% of PrimeNG's \\d+ modules"), 65, 'shipped'), []);
    assert.deepEqual(auditSite(text, site("ships \\d+ of PrimeNG's %N% modules"), 117, 'total'), []);
});

test('the cost table is compared as a set: a promoted module left listed is caught', () => {
    const problems = auditTable(['accordion', 'carousel'], ['accordion', 'carousel', 'iftalabel']);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /lists `iftalabel`/);
    assert.match(problems[0], /promoted, or renamed/);
});

test('and a new attic module with no row is caught the other way', () => {
    const problems = auditTable(['accordion', 'carousel', 'tree'], ['accordion', 'carousel']);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /no row for `tree`/);
});

test('a table that matches the attic exactly produces nothing', () => {
    assert.deepEqual(auditTable(['accordion', 'tree'], ['accordion', 'tree']), []);
});

test('the counts a length check would accept are still caught by the set comparison', () => {
    // Same size, different membership — every number on the page can be right while the table
    // sends a contributor at a module that already shipped.
    const problems = auditTable(['accordion', 'tree'], ['accordion', 'iftalabel']);
    assert.equal(problems.length, 2);
});

test('the gate runs clean against the repository as it stands', () => {
    const out = execFileSync('node', [at('tools/check-module-counts.mjs')], { encoding: 'utf8', cwd: repoRoot });
    assert.match(out, /✓ check-module-counts/);
});

test('the gate is actually wired into `npm run check`', () => {
    // A gate file that nothing invokes is a file, not a gate. This is the cheap version of the
    // question check-gate-count asks in full.
    const scripts = JSON.parse(readFileSync(at('package.json'), 'utf8')).scripts;
    assert.ok(scripts['check:module-counts'], 'no check:module-counts script');
    assert.match(scripts.check, /npm run check:module-counts/, 'the aggregate `check` script does not run it');
});
