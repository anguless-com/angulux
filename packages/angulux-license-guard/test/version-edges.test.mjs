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
