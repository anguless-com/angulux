import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SIGNAL_PROP_RE, TEMPLATE_ATTR_RE, angularMajorFrom, exemptionState, templateLiterals } from '../codemod/name-scan-lib.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = (p) => join(repoRoot, p);
const EXCEPTIONS = JSON.parse(readFileSync(at('tools/codemod/name-exceptions.json'), 'utf8'));

/**
 * The third gate to get tests, and the one that had the most expensive blind spot.
 *
 * `check:names` is the guard that keeps PrimeTek's trademarks out of angulux's public API —
 * the thing this project exists to do. It was green for months while FIFTEEN branded signal
 * inputs shipped in `@anguless/angulux@22.x` and were advertised in the docs corpus, because
 * Group 3 matched `@Input() pFoo` and this codebase writes `pFoo = input()`.
 *
 * Two nets were added on 2026-08-03: the signal form, and a generic attribute net for inline
 * templates (element tags had one from the start; attributes only had a 35-name allowlist).
 */

test('the signal-input net matches the form that got past the decorator matcher', () => {
    const hits = (s) => [...s.matchAll(SIGNAL_PROP_RE)].map((m) => m[1]);
    assert.deepEqual(hits('pTooltipUnstyled = input<boolean | undefined>();'), ['pTooltipUnstyled']);
    assert.deepEqual(hits('pButtonPT = input.required<ButtonPassThrough>();'), ['pButtonPT']);
    assert.deepEqual(hits('pFooChange = output<string>();'), ['pFooChange']);
    assert.deepEqual(hits('pValue = model(0);'), ['pValue']);
    // not a branded public member: no p+uppercase, or not a signal factory
    assert.deepEqual(hits('unstyled = input<boolean>();'), []);
    assert.deepEqual(hits('pTooltipUnstyled = 3;'), []);
    assert.deepEqual(hits('const pending = inputs.length;'), []);
});

test('the attribute net only ever sees template text, never TypeScript', () => {
    // The reason the net is scoped: this is ordinary code and must not be a finding.
    const code = 'const pFoo = 1;\nconst obj = { pBar: 2 };\nlet pBaz = compute();';
    assert.deepEqual(templateLiterals(code), []);

    const comp = 'template: `<div [pTooltip]="t" pSortableColumn="name"><span (pFoo)="x()"></span></div>`';
    const [tpl] = templateLiterals(comp);
    assert.ok(tpl, 'an HTML-looking backtick literal is a template');
    assert.deepEqual([...tpl.body.matchAll(TEMPLATE_ATTR_RE)].map((m) => m[1]), ['pTooltip', 'pSortableColumn', 'pFoo']);
});

test('a backtick literal with no tag in it is not a template', () => {
    // sql`SELECT pFoo FROM t` and message strings must not be scanned for attributes
    assert.deepEqual(templateLiterals('const q = `SELECT pFoo FROM t`;'), []);
    assert.equal(templateLiterals('const t = `<b>hi</b>`;').length, 1);
});

test('the exception list expires against the real Angular major, not against a note', () => {
    const real = angularMajorFrom(readFileSync(at('pnpm-workspace.yaml'), 'utf8'));
    assert.equal(real, EXCEPTIONS.untilAngularMajor, 'the committed exception list must match the Angular line in the catalog');

    assert.equal(angularMajorFrom("        '@angular/core': ^23.0.0\n"), 23);
    const expired = exemptionState(EXCEPTIONS, 23, new Set(EXCEPTIONS.publicApiNames));
    assert.equal(expired.exempt.size, 0, 'past the major, nothing is exempt any more');
    assert.match(expired.problems.join('\n'), /EXPIRED/);
});

test('an exception naming something that no longer exists is a failure, not a leftover', () => {
    const found = new Set(EXCEPTIONS.publicApiNames.filter((n) => n !== 'pTooltipUnstyled'));
    const { problems } = exemptionState(EXCEPTIONS, EXCEPTIONS.untilAngularMajor, found);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /STALE exception: `pTooltipUnstyled`/);
});

test('the accepted-debt list is exactly what src actually declares — no more, no less', () => {
    const walk = (d, o = []) => {
        for (const e of readdirSync(d)) {
            const p = join(d, e);
            statSync(p).isDirectory() ? walk(p, o) : e.endsWith('.ts') && o.push(p);
        }
        return o;
    };
    const declared = new Set();
    for (const f of walk(at('packages/angulux/src'))) {
        for (const m of readFileSync(f, 'utf8').matchAll(SIGNAL_PROP_RE)) declared.add(m[1]);
    }
    assert.deepEqual(
        [...declared].sort(),
        [...EXCEPTIONS.publicApiNames].sort(),
        'src and name-exceptions.json disagree — a branded input was added or renamed without updating the list'
    );
    assert.equal(declared.size, 15, 'the debt is 15 names; changing this number is a deliberate act');
});

test('the gate runs green and says the debt out loud on every run', () => {
    // The one thing this debt must never do is become quiet, so the banner is part of the
    // contract, not decoration.
    const out = execFileSync(process.execPath, [at('tools/codemod/scan-prime-names.mjs')], { cwd: repoRoot, encoding: 'utf8' });
    assert.match(out, /ACCEPTED, NOT FIXED — 15 PrimeNG-branded name\(s\) still in the public API/);
    assert.match(out, /expires by itself when @angular\/core moves past \^22/);
    assert.match(out, /✓ scan-prime-names: no PrimeNG names left/);
});
