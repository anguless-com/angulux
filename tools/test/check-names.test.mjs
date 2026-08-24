import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ATTRIBUTION_MAX, SIGNAL_PROP_RE, TEMPLATE_ATTR_RE, angularMajorFrom, attributionRanges, exemptionState, templateLiterals } from '../codemod/name-scan-lib.mjs';

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

/**
 * Added 2026-08-24 with `apps/showcase/`. The guard had scanned `packages/angulux/src` and
 * `attic/` only, so the documentation site — the highest-exposure surface in the project, and
 * the one about to receive ~600 demo files inherited from the MIT PrimeNG showcase — was
 * outside every net. Proven by probe before the fix: the same file containing
 * `'<p-button>'` failed in `src/` and passed in `apps/showcase/`.
 */

test('the strict scope covers the showcase, and says so', () => {
    const out = execFileSync(process.execPath, [at('tools/codemod/scan-prime-names.mjs')], { cwd: repoRoot, encoding: 'utf8' });
    assert.match(out, /no PrimeNG names left in selector\/API\/trademark positions in src\/ or apps\/showcase\/src\//);
});

test('an attribution region is recognised in BOTH comment syntaxes', () => {
    // The HTML form is the one that matters: the notice has to live where it is RENDERED,
    // and inside an Angular template `/* … */` is not a comment but text the reader sees.
    const html = attributionRanges('<!-- prime-names:attribution why -->Copyright PrimeTek<!-- prime-names:end -->');
    assert.equal(html.length, 1);
    assert.equal(html[0].size, 'Copyright PrimeTek'.length);

    const js = attributionRanges('/* prime-names:attribution why */\nCopyright PrimeTek\n/* prime-names:end */');
    assert.equal(js.length, 1);

    assert.deepEqual(attributionRanges('const x = 1; // PrimeTek'), [], 'no marker, no excuse');
});

test('a marker that is never closed excuses nothing', () => {
    // Otherwise the cheapest way to silence the gate would be to open a region and forget it.
    assert.deepEqual(attributionRanges('<!-- prime-names:attribution -->PrimeTek everywhere below'), []);
    assert.deepEqual(attributionRanges('/* prime-names:attribution */ PrimeTek'), []);
});

test('the cap is small enough that a region has to be read, not skimmed', () => {
    assert.equal(ATTRIBUTION_MAX, 2000, 'raising this is a deliberate act: it is how much brand prose goes unchecked');

    const [region] = attributionRanges(`<!-- prime-names:attribution -->${'x'.repeat(3000)}<!-- prime-names:end -->`);
    assert.ok(region.size > ATTRIBUTION_MAX, 'the scanner reports the size so it can enforce the cap');
});

test('every declared attribution region is announced on green runs', () => {
    // A hole in a gate is allowed to exist. It is never allowed to be quiet.
    const out = execFileSync(process.execPath, [at('tools/codemod/scan-prime-names.mjs')], { cwd: repoRoot, encoding: 'utf8' });
    assert.match(out, /📎 ATTRIBUTION REGIONS/);
    assert.match(out, /apps.showcase.src.pages.home\.ts/, 'the site renders the MIT notice, so it must hold a declared region');
});
