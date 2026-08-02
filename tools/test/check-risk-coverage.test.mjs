import { test } from 'node:test';
import assert from 'node:assert/strict';

import { aliasesOf, analyze } from '../scope/check-risk-coverage.mjs';

/**
 * The second gate to get tests, for the reason the first one did.
 *
 * Until 2026-08-03 the `transitive` branch of this gate checked that the `renderedBy` FIELD
 * EXISTED and nothing else — not whether the named parent renders the child, not whether
 * anything reaches that parent. Nine of thirteen risky decorators rested on a typed
 * sentence. The proof it was hollow: delete `<agl-tieredmenu>` from apps/verify/src/app.ts
 * and the gate stayed green.
 *
 * The first mechanical run rejected two manifest entries, and both were genuinely wrong —
 * the coverage was real, the stated reason was not. Those two are pinned below as the
 * regression corpus, because "we fixed the manifest" is worth nothing without something
 * that fails when the check that found them stops working.
 */

test('the manifest and the source agree — no problems at all', () => {
    const { problems } = analyze();
    assert.deepEqual(problems, [], `check-risk-coverage found:\n${problems.map((p) => `  ${p}`).join('\n')}`);
});

test('every risky decorator is genuinely reachable from the verification app', () => {
    const { risk, byAlias, reachable } = analyze();
    const unreachable = [...risk].filter(([, meta]) => !reachable.has(byAlias.get(aliasesOf(meta.raw)[0]))).map(([sel]) => sel);
    assert.deepEqual(unreachable, [], `not reachable from app.ts by real template containment: ${unreachable.join(', ')}`);
    assert.equal(risk.size, 13, 'the risky set changed size — update this number deliberately, with a look at the manifest');
});

test('multi-hop chains through a NON-risky component are legitimate: select -> agl-overlay -> agl-motion', () => {
    // This is the case that makes a naive "parent must itself be risky" rule wrong.
    // agl-overlay is not Eager, so it is not in the risky set, but it is the only production
    // template that renders <agl-motion>, and select/multiselect render agl-overlay.
    const { byAlias, reachable, renders } = analyze();
    const overlay = byAlias.get('agl-overlay');
    const motion = byAlias.get('agl-motion');
    assert.ok(overlay && motion, 'agl-overlay and agl-motion must both exist in src');
    assert.equal(renders(overlay, motion), true, 'agl-overlay must render <agl-motion>');
    assert.equal(reachable.has(overlay), true, 'agl-overlay must be reachable from app.ts (via select/multiselect)');
});

test('agl-motion: the OLD renderedBy claim is false of the source, and stays false', () => {
    // Regression #1. It named agl-dialog, agl-select and agl-multiselect. Dialog reaches
    // motion through the [aglMotion] DIRECTIVE — a different declaration — and select and
    // multiselect never mention motion at all; they render agl-overlay, which does.
    const { byAlias, renders } = analyze();
    const motion = byAlias.get('agl-motion');
    for (const wrong of ['agl-dialog', 'agl-select', 'agl-multiselect']) {
        assert.equal(renders(byAlias.get(wrong), motion), false, `${wrong} does not render <agl-motion> — if this changed, fix the manifest, not the test`);
    }
});

test('agl-treeTableToggler: treetable does not render it — the verification app does', () => {
    // Regression #2. It was filed as transitive via agl-treetable. Treetable projects a
    // caller-supplied body template; the toggler lives in the app's own template, which is
    // what makes it `via: template`.
    const { byAlias, manifest, renders } = analyze();
    const toggler = byAlias.get('agl-treetabletoggler');
    assert.ok(toggler, 'the toggler component must exist');
    assert.equal(renders(byAlias.get('agl-treetable'), toggler), false, 'agl-treetable must NOT render the toggler');
    assert.equal(manifest['agl-treeTableToggler'].via, 'template');
    assert.equal('renderedBy' in manifest['agl-treeTableToggler'], false, 'a `template` entry has no parent to name');
});

test('aliasesOf normalises every selector shape this repo actually uses', () => {
    assert.deepEqual(aliasesOf('agl-motion'), ['agl-motion']);
    assert.deepEqual(aliasesOf('[aglTreeTableBody]'), ['agltreetablebody']);
    assert.deepEqual(aliasesOf('li[aglMultiSelectItem]'), ['aglmultiselectitem']);
    // three aliases, two of which collapse to the same lowercase name — dedupe, or the
    // failure message prints the same string twice and reads like a bug in the gate
    assert.deepEqual(aliasesOf('agl-treeTableToggler, agl-treetabletoggler, agl-treetable-toggler'), [
        'agl-treetabletoggler',
        'agl-treetable-toggler'
    ]);
});

test('every transitive entry names a parent that really renders it and is really reached', () => {
    // The property the whole rewrite exists to enforce, asserted directly rather than only
    // through `problems` being empty.
    const { byAlias, manifest, reachable, renders, risk } = analyze();
    for (const [sel, entry] of Object.entries(manifest)) {
        if (entry.via !== 'transitive') continue;
        const self = byAlias.get(aliasesOf(risk.get(sel).raw)[0]);
        const parents = entry.renderedBy
            .split(',')
            .map((s) => s.trim().replace(/\s+when\s+.*$/i, '').toLowerCase())
            .map((n) => byAlias.get(n));
        assert.ok(
            parents.every(Boolean),
            `${sel}: renderedBy names a selector no @Component declares`
        );
        const actual = parents.filter((p) => renders(p, self));
        assert.ok(actual.length, `${sel}: no named parent actually renders it`);
        assert.ok(actual.some((p) => reachable.has(p)), `${sel}: nothing in app.ts reaches the parent that renders it`);
    }
});
