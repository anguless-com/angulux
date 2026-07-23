import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_COMMERCIAL, ALWAYS_COMMERCIAL, TABLE_VERIFIED } from '../src/boundary.mjs';

test('records the boundary for every package PrimeTek moved', () => {
    // These values are the legal record. They are cross-checked against the LICENSE file
    // inside each published tarball; changing one is changing a claim about someone else's
    // licensing, so the test pins them rather than trusting a later edit.
    assert.equal(FIRST_COMMERCIAL.primeng, '22.0.0');
    assert.equal(FIRST_COMMERCIAL.primevue, '5.0.0');
    assert.equal(FIRST_COMMERCIAL.primereact, '11.0.0');
    assert.equal(FIRST_COMMERCIAL.primeicons, '8.0.0');
    assert.equal(FIRST_COMMERCIAL['@primeuix/utils'], '0.8.0');
    assert.equal(FIRST_COMMERCIAL['@primeuix/styled'], '1.0.0');
    assert.equal(FIRST_COMMERCIAL['@primeuix/styles'], '3.0.0');
    assert.equal(FIRST_COMMERCIAL['@primeuix/themes'], '3.0.0');
    assert.equal(FIRST_COMMERCIAL['@primeuix/motion'], '1.0.0');
});

test('records the packages that are commercial in every version', () => {
    assert.ok(ALWAYS_COMMERCIAL.includes('@primeui/license-manager'));
    assert.ok(ALWAYS_COMMERCIAL.includes('@primeicons/angular'));
});

test('every boundary is a plain semver triple', () => {
    for (const [name, version] of Object.entries(FIRST_COMMERCIAL)) {
        assert.match(version, /^\d+\.\d+\.\d+$/, `${name} boundary is not a semver triple`);
    }
});

test('carries the date the table was verified', () => {
    // Freshness is the whole honesty mechanism: no cadence is promised, so the date has to
    // be visible. An undated legal table is a claim with no way to judge it.
    assert.match(TABLE_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(Date.parse(TABLE_VERIFIED)), 'not a real date');
});
