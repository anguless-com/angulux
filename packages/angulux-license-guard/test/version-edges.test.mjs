import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect } from '../src/detect.mjs';
import { isPrimeTekPackage } from '../src/boundary.mjs';

const flagged = (name, version) => detect([{ name, version }]).violations.length === 1;

test('build metadata does not smuggle a commercial version past the comparison', () => {
    // Number('0+build') is NaN, and every comparison with NaN is false — so a version
    // carrying build metadata was reported CLEAN. A false green on exactly the thing this
    // package exists to catch.
    assert.ok(flagged('primeng', '22.0.0+build'), '22.0.0+build must be caught');
    assert.ok(flagged('primeng', '22.0.0+20260101'), 'dated build metadata must be caught');
    assert.ok(flagged('primeng', '22.0.1+x'), 'patch with build metadata must be caught');
});

test('build metadata on an MIT version is still clean', () => {
    assert.ok(!flagged('primeng', '21.1.9+build'));
});

test('prerelease AND build metadata together are handled', () => {
    assert.ok(flagged('primeng', '22.0.0-rc.1+build'));
    assert.ok(!flagged('primeng', '21.1.9-rc.1+build'));
});

test('a version with unreadable numbers is never silently treated as below the boundary', () => {
    // Whatever the shape, the one outcome that must not happen is a quiet pass.
    for (const v of ['22.x.0', '22..0', 'twenty-two.0.0']) {
        assert.ok(flagged('primeng', v), `${v} must not pass silently`);
    }
});

test('the PrimeTek namespace list contains only names that actually exist', () => {
    // `primeblock` was in this list and does not exist on npm (E404) — invented while
    // writing the matcher, then "verified" by a test written to the same invention.
    // primefaces IS published by PrimeTek and was missing.
    assert.ok(isPrimeTekPackage('primefaces'), 'primefaces is a real PrimeTek npm package');
    assert.ok(!isPrimeTekPackage('primeblock'), 'primeblock does not exist — drop it');
});

test('still does not claim packages that merely start with prime', () => {
    for (const n of ['primer', 'prettier', 'prime-utils', '@acme/primetime']) {
        assert.ok(!isPrimeTekPackage(n), `${n} is not PrimeTek's`);
    }
});

test('an -lts build is commercial, although its number sits below the boundary', () => {
    // PrimeNG's LTS line is numbered inside the MIT range: 77 builds on npm on 2026-11-17, from
    // 13.4.2-lts to 20.5.1-lts. Stripping the prerelease suffix — the rule that catches
    // 22.0.0-rc.1 — turned 20.5.1-lts into 20.5.1, and every one of them passed as MIT.
    for (const v of ['20.5.1-lts', '13.4.2-lts', '17.18.15-lts']) {
        const { violations } = detect([{ name: 'primeng', version: v }]);
        assert.equal(violations.length, 1, `${v} must not pass`);
        assert.equal(violations[0].kind, 'commercial', `${v} is under the LTS licence, not merely unverified`);
    }
});

test('the lts tag is read as a prerelease identifier, in any case and position', () => {
    for (const v of ['20.5.1-LTS', '20.5.1-lts.2', '20.5.1-lts+build', '20.5.1-lts-hotfix.1', '20.5.1-rc.1.lts']) {
        assert.ok(flagged('primeng', v), `${v} must be caught`);
    }
    // A substring is not the tag, and the community release of the same number stays clean.
    assert.ok(!flagged('primeng', '21.1.9-alts.1'));
    assert.ok(!flagged('primeng', '20.5.1'));
    assert.ok(!flagged('primeng', '21.1.10'));
});

test('the lts tag is not limited to the one package that uses it today', () => {
    // Only primeng published -lts builds on 2026-11-17. A first one from another package in the
    // table must not be waved through by the number either.
    assert.ok(flagged('primevue', '4.3.9-lts'));
    assert.ok(flagged('@primeuix/themes', '2.0.3-lts'));
});
