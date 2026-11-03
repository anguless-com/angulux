import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ATTRIBUTION_MAX, SIGNAL_PROP_RE, TEMPLATE_ATTR_RE, angularMajorFrom, attributionRanges, cssLiterals, exemptionState, pTypeSelectors, templateLiterals } from '../codemod/name-scan-lib.mjs';

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

/**
 * Group 12, added 2026-11-02 for #175. No group read the CSS inside a style file's template
 * literal, so about 40 `p-*` element names there outlived the rename while the gate stayed green:
 * `p-inputnumber.ng-invalid.ng-dirty > .p-inputtext` matched no element again, and a rule that
 * matches nothing fails nothing. Run against the tree at 6f8c0ba (main when #175 was filed), the
 * new group reports exactly 40 of them, 22 in the Reactive Forms invalid fallbacks.
 */

const typeSelectors = (css) => pTypeSelectors(css).map((h) => h.name);

test('the CSS net flags p-* element names in type-selector position, the shapes #175 found', () => {
    assert.deepEqual(typeSelectors('p-inputnumber.ng-invalid.ng-dirty > .p-inputtext { color: red; }'), ['p-inputnumber']);
    assert.deepEqual(typeSelectors('.p-datatable-thead > tr > th p-columnfilter { width: 100%; }'), ['p-columnfilter']);
    assert.deepEqual(typeSelectors('p-sortIcon, p-sort-icon, p-sorticon { vertical-align: middle; }'), ['p-sortIcon', 'p-sort-icon', 'p-sorticon']);
    assert.deepEqual(typeSelectors(':is(agl-foo, p-foo) + p-bar { gap: 0; }'), ['p-foo', 'p-bar']);
    assert.deepEqual(typeSelectors('@media (min-width: 640px) { th p-columnfilter { width: auto; } }'), ['p-columnfilter']);
    assert.deepEqual(typeSelectors('.p-a { color: red; & > p-b { color: blue; } }'), ['p-b'], 'a nested rule is a selector too');
});

test('the CSS net leaves classes, values, keyframes, comments and strings alone', () => {
    // Each of these is a p-* name angulux keeps on purpose, or one that is not a selector at all.
    assert.deepEqual(typeSelectors('.p-button.p-component > .p-button-label { color: red; }'), [], 'a class is kept by design');
    assert.deepEqual(typeSelectors('[data-p-disabled="true"] .p-x, [p-foo] { opacity: 0.5; }'), [], 'attribute selectors are not elements');
    assert.deepEqual(typeSelectors('.p-drawer-left { animation: p-animate-drawer-enter-left 0.5s; }'), [], 'a declaration value is not a selector');
    assert.deepEqual(typeSelectors('@keyframes p-animate-password-enter { from { opacity: 0; } to { opacity: 1; } }'), [], 'neither a keyframe name nor its steps');
    assert.deepEqual(typeSelectors('/* p-columnfilter used to sit here */ .p-x { content: "p-foo"; color: var(--p-primary-color); }'), []);
    assert.deepEqual(typeSelectors('agl-p-foo, x-p-bar, #p-baz, :p-qux { color: red; }'), [], 'p- inside a longer name, an id or a pseudo');
});

test('a stylesheet is found by its marker anywhere, and by its shape inside style/', () => {
    const file = [
        "// a comment with a stray backtick ` must not pair with the next one",
        'const style = /*css*/ `',
        '    ${base_style}',
        '    p-checkbox.ng-invalid { color: red; }',
        '`;',
        'const tagged = css`p-radiobutton { color: red; }`;',
        'const unmarked = `p-password { color: red; }`;',
        "const classes = { root: ({ instance }) => [`p-button-${instance.size === 'small' ? `sm` : 'lg'}`] };"
    ].join('\n');

    const outside = cssLiterals(file, false).flatMap(({ start, css }) => pTypeSelectors(css).map((h) => [h.name, file.slice(start + h.index, start + h.index + h.name.length)]));
    assert.deepEqual(outside, [['p-checkbox', 'p-checkbox'], ['p-radiobutton', 'p-radiobutton']], 'offsets point back into the file; an unmarked literal outside style/ is not CSS');

    const inside = cssLiterals(file, true).flatMap(({ css }) => typeSelectors(css));
    assert.deepEqual(inside, ['p-checkbox', 'p-radiobutton', 'p-password'], 'inside style/ a rule block is enough, and a class-name template is not one');

    assert.equal(cssLiterals(file, true)[0].css.includes('base_style'), false, 'an interpolated stylesheet is blanked, not read as this one');
});

test('the CSS net reads every marked stylesheet in src, and the gate refuses to read none', () => {
    // A floor on what was EXAMINED, never on what was found: finding nothing is the pass.
    const src = at('packages/angulux/src');
    const files = [];
    const walk = (dir) => {
        for (const name of readdirSync(dir)) {
            const p = join(dir, name);
            if (statSync(p).isDirectory()) walk(p);
            else if (p.endsWith('.ts')) files.push(p);
        }
    };
    walk(src);

    let markers = 0;
    let read = 0;
    for (const file of files) {
        const text = readFileSync(file, 'utf8');
        markers += (text.match(/\/\*css\*\/\s*`/g) ?? []).length;
        read += cssLiterals(text, /[\\/]style[\\/][^\\/]+$/.test(file)).length;
    }
    assert.ok(markers >= 20, `only ${markers} marked stylesheets under ${src}: did the marker change?`);
    assert.ok(read >= markers, `${read} stylesheets read, ${markers} marked: the parser lost some`);

    const gate = readFileSync(at('tools/codemod/scan-prime-names.mjs'), 'utf8');
    assert.match(gate, /if \(stylesheetsExamined === 0\) \{[\s\S]*?process\.exit\(1\)/, 'reading no stylesheet must fail the gate, not pass it');
});

test('a p-* host put back into a real stylesheet is caught', () => {
    // Mutation on the shipped source rather than a fixture: the shape #175 found, restored.
    const real = readFileSync(at('packages/angulux/src/inputnumber/style/inputnumberstyle.ts'), 'utf8');
    const scan = (text) => cssLiterals(text, true).flatMap(({ css }) => typeSelectors(css));
    assert.deepEqual(scan(real), [], 'the shipped stylesheet is clean');
    const mutated = real.replace('agl-inputnumber.ng-invalid.ng-dirty', 'p-inputnumber.ng-invalid.ng-dirty');
    assert.notEqual(mutated, real, 'the mutation must apply');
    assert.deepEqual(scan(mutated), ['p-inputnumber']);
});
