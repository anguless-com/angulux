import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect } from '../src/detect.mjs';

test('a PrimeTek package the table has never seen is a violation, not a pass', () => {
    // The hole this closes: `if (!floor) continue` printed "all clear" for any package
    // PrimeTek published after the table was written. On a licensing question, silence
    // read as approval.
    const r = detect([{ name: '@primeuix/unknown-thing', version: '1.0.0' }]);
    assert.equal(r.violations.length, 1);
    assert.equal(r.violations[0].name, '@primeuix/unknown-thing');
    assert.match(r.violations[0].reason, /not (in|recorded)|could not be verified|unknown/i);
});

test('an unrecognised package under any PrimeTek namespace fails closed', () => {
    const r = detect([
        { name: '@primeui/something-new', version: '2.0.0' },
        { name: '@primeicons/vue', version: '1.0.0' }
    ]);
    assert.equal(r.violations.length, 2);
});

test('a future PrimeTek product name fails closed', () => {
    const r = detect([{ name: 'primeblock', version: '1.0.0' }]);
    assert.equal(r.violations.length, 1);
});

test('packages that merely contain "prime" are NOT PrimeTek and stay clean', () => {
    // Failing closed must not mean failing indiscriminately. Turning a stranger's build red
    // over their own `prime-utils` would make the tool something people uninstall.
    const r = detect([
        { name: 'prettier', version: '3.0.0' },
        { name: 'primer', version: '1.0.0' },
        { name: 'prime-utils', version: '1.0.0' },
        { name: '@acme/primetime', version: '1.0.0' },
        { name: 'lodash', version: '4.17.21' }
    ]);
    assert.deepEqual(r.violations, []);
});

test('a known package on an MIT version is still clean — the table wins where it applies', () => {
    const r = detect([
        { name: 'primeng', version: '21.1.9' },
        { name: '@primeuix/themes', version: '2.0.3' }
    ]);
    assert.deepEqual(r.violations, []);
    assert.equal(r.seen.length, 2);
});
