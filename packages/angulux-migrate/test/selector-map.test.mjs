import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELEMENTS, ATTRIBUTES, IMPORT_FROM, IMPORT_TO } from '../src/selector-map.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const source = JSON.parse(readFileSync(resolve(repoRoot, 'tools/codemod/selectors.json'), 'utf8'));

// The transformation the library's own rename performed, quoted from tools/codemod/rename.mjs:
//   aglElem = (s) => 'agl-' + s.slice(2)
//   aglAttr = (s) => 'agl'  + s.slice(1)
const aglElem = (s) => 'agl-' + s.slice(2);
const aglAttr = (s) => 'agl' + s.slice(1);

test('the shipped map is exactly the inverse the library rename produced', () => {
    // Derived, not hand-copied. The package cannot read selectors.json at run time (it is
    // not shipped), so the data lives in src/ — and this test is what keeps the copy honest.
    // If someone adds a selector to the library and not here, migrate would silently leave
    // that component un-migrated in a stranger's project.
    const expectedElements = Object.fromEntries(source.elementSelectors.map((s) => [s, aglElem(s)]));
    const expectedAttributes = Object.fromEntries(source.attributeSelectors.map((s) => [s, aglAttr(s)]));
    assert.deepEqual(ELEMENTS, expectedElements);
    assert.deepEqual(ATTRIBUTES, expectedAttributes);
});

test('covers every selector the library knows about', () => {
    assert.equal(Object.keys(ELEMENTS).length, source.elementSelectors.length);
    assert.equal(Object.keys(ATTRIBUTES).length, source.attributeSelectors.length);
});

test('spot-checks the two transformations by hand', () => {
    assert.equal(ELEMENTS['p-button'], 'agl-button');
    assert.equal(ELEMENTS['p-table'], 'agl-table');
    assert.equal(ATTRIBUTES['pButton'], 'aglButton');
    assert.equal(ATTRIBUTES['pTooltip'], 'aglTooltip');
});

test('import target is the SCOPED package name', () => {
    // rename.mjs predates the scope decision and still says bare `angulux`. A migration that
    // rewrote imports to the bare name would produce a project that cannot install.
    assert.equal(IMPORT_FROM, 'primeng');
    assert.equal(IMPORT_TO, '@anguless/angulux');
});

test('no mapping is an identity — every entry actually changes something', () => {
    for (const [from, to] of [...Object.entries(ELEMENTS), ...Object.entries(ATTRIBUTES)]) {
        assert.notEqual(from, to, `${from} maps to itself`);
    }
});
