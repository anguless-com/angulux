import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_COMMERCIAL, ALWAYS_COMMERCIAL, TABLE_VERIFIED } from '../src/boundary.mjs';
import { detect } from '../src/detect.mjs';

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

test('records the packages the guard treats as commercial at every version', () => {
    // The name of this test used to be "records the packages that are commercial in every
    // version", which asserted something that is not true and would have kept asserting it
    // forever. `@primeicons/angular` has eleven MIT prereleases — verified 2026-08-26 by
    // reading package/LICENSE out of the tarballs, not by trusting the registry field.
    //
    // The LIST is still right, because over-flagging a package angulux never installs fails
    // closed. Only the claim attached to it was wrong. Keeping a test whose name restates the
    // false version is how the invention survives the correction.
    assert.ok(ALWAYS_COMMERCIAL.includes('@primeui/license-manager'));
    assert.ok(ALWAYS_COMMERCIAL.includes('@primeicons/angular'));
});

test('a prerelease of a commercial major is commercial, not "below the boundary"', () => {
    // Semver orders 0.8.0-rc.1 BELOW 0.8.0, so a naive comparison would wave through the
    // exact artifact where PrimeTek's licence actually changed: the flip landed at -rc.1
    // (2026-06-28 for most packages, 2026-07-02 for @primeuix/utils), before any stable.
    // detect.mjs strips the suffix for that reason; this pins the behaviour to the fact.
    const { violations } = detect([
        { name: '@primeuix/utils', version: '0.8.0-rc.1' },
        { name: '@primeuix/themes', version: '3.0.0-beta.1' }
    ]);
    const utils = violations.find((v) => v.name === '@primeuix/utils');
    assert.equal(utils?.kind, 'commercial', '0.8.0-rc.1 is a release candidate OF the commercial 0.8.0');

    // And the other direction, which is the cost of that rule and is accepted deliberately:
    // 3.0.0-beta.1 really was MIT, and the guard still calls it commercial. Failing closed on
    // a prerelease nobody can reach through a caret range is the safe half of the trade.
    const themes = violations.find((v) => v.name === '@primeuix/themes');
    assert.equal(themes?.kind, 'commercial', 'the rule over-flags MIT prereleases on purpose');
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
