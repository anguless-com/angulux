import { test } from 'node:test';
import assert from 'node:assert/strict';

import { surfaceOf, diffSurface, reconcile } from '../api-surface-lib.mjs';

/**
 * The gate behind the API freeze: nothing the last release shipped is removed or retyped
 * without a record.
 *
 * Fixtures are object literals. The script half (which tag, which file) is proven by running
 * it; what decides red or green is all here.
 */

const corpus = (declaration) => ({ modules: [{ name: 'dialog', declarations: [{ name: 'Dialog', selector: 'agl-dialog', ...declaration }] }] });
const shipped = corpus({
    inputs: [{ name: 'visible', type: 'boolean' }],
    outputs: [{ name: 'onHide', type: 'EventEmitter<any>' }],
    slots: [{ name: 'header' }]
});
const breaksBetween = (a, b) => {
    const d = diffSurface(surfaceOf(a), surfaceOf(b));
    return [...d.removed, ...d.changed];
};
const TAG = 'angulux-v22.6.7';

test('the surface is one readable line per selector, input, output and slot', () => {
    assert.deepEqual([...surfaceOf(shipped).keys()], ['dialog/Dialog selector', 'dialog/Dialog input visible', 'dialog/Dialog output onHide', 'dialog/Dialog slot header']);
});

test('an identical corpus has no breaks and no additions', () => {
    const d = diffSurface(surfaceOf(shipped), surfaceOf(structuredClone(shipped)));
    assert.deepEqual([d.removed.length, d.changed.length, d.added.length], [0, 0, 0]);
});

test('a removed input, a removed output and a removed slot are each a break', () => {
    for (const part of ['inputs', 'outputs', 'slots']) {
        const now = structuredClone(shipped);
        now.modules[0].declarations[0][part] = [];
        const breaks = breaksBetween(shipped, now);
        assert.equal(breaks.length, 1, part);
        assert.equal(breaks[0].change, 'removed');
    }
});

test('a renamed input is a removal plus an addition, so it cannot pass as "nothing lost"', () => {
    const now = corpus({ ...shipped.modules[0].declarations[0], inputs: [{ name: 'open', type: 'boolean' }] });
    const d = diffSurface(surfaceOf(shipped), surfaceOf(now));
    assert.deepEqual(
        d.removed.map((b) => b.key),
        ['dialog/Dialog input visible']
    );
    assert.deepEqual(d.added, ['dialog/Dialog input open']);
});

test('a retyped input and a changed selector are breaks that carry both values', () => {
    const now = corpus({ ...shipped.modules[0].declarations[0], selector: 'agl-modal', inputs: [{ name: 'visible', type: 'boolean | undefined' }] });
    const breaks = breaksBetween(shipped, now);
    assert.deepEqual(breaks.map((b) => b.change).sort(), ['changed', 'changed']);
    const input = breaks.find((b) => b.key.endsWith('input visible'));
    assert.deepEqual([input.was, input.now], ['boolean', 'boolean | undefined']);
});

test('a whole declaration disappearing loses every one of its entries', () => {
    assert.equal(breaksBetween(shipped, { modules: [] }).length, 4);
});

test('an added input is an addition and never a break', () => {
    const now = structuredClone(shipped);
    now.modules[0].declarations[0].inputs.push({ name: 'initialFocus', type: 'string' });
    const d = diffSurface(surfaceOf(shipped), surfaceOf(now));
    assert.deepEqual([d.removed.length, d.changed.length], [0, 0]);
    assert.deepEqual(d.added, ['dialog/Dialog input initialFocus']);
});

const aBreak = { key: 'dialog/Dialog input visible', change: 'removed', was: 'boolean' };
const anException = { key: aBreak.key, change: 'removed', since: TAG, reason: 'approved in #1' };

test('a break with no exception is unexcused', () => {
    assert.equal(reconcile([aBreak], [], TAG).unexcused.length, 1);
});

test('an exception for this baseline excuses exactly its own break', () => {
    const other = { key: 'dialog/Dialog output onHide', change: 'removed', was: '' };
    const r = reconcile([aBreak, other], [anException], TAG);
    assert.deepEqual(
        r.unexcused.map((b) => b.key),
        [other.key]
    );
    assert.equal(r.excused.length, 1);
});

test('an exception for a removal does not excuse a retype of the same entry', () => {
    const r = reconcile([{ ...aBreak, change: 'changed', now: 'string' }], [anException], TAG);
    assert.equal(r.unexcused.length, 1);
    assert.equal(r.unused.length, 1);
});

test('an exception for this baseline that matches nothing is unused, which fails', () => {
    assert.equal(reconcile([], [anException], TAG).unused.length, 1);
});

test('an exception granted against an earlier release is expired: it excuses nothing and fails nothing', () => {
    const r = reconcile([aBreak], [{ ...anException, since: 'angulux-v22.6.6' }], TAG);
    assert.deepEqual([r.unexcused.length, r.unused.length, r.expired.length], [1, 0, 1]);
});

test('an exception without a reason, or with an unknown change, is malformed and excuses nothing', () => {
    const noReason = { key: aBreak.key, change: 'removed', since: TAG };
    const badChange = { ...anException, change: 'whatever' };
    const r = reconcile([aBreak], [noReason, badChange], TAG);
    assert.deepEqual([r.malformed.length, r.unexcused.length], [2, 1]);
});
