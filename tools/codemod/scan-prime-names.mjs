#!/usr/bin/env node
/**
 * scan-prime-names — the guard that catches every PrimeNG name left behind by a rename.
 *
 * Six half-rename incidents shared one root cause: the codemod renamed by SYNTACTIC
 * CONTEXT (`<p-tag`, `selector: 'p-tag'`, token after whitespace), so every place a
 * name lived as a BARE STRING escaped the net:
 *   1. multi-segment import paths   `'primeng/types/button'`
 *   2. @Input aliases               `@Input('pTooltip')`
 *   3. property names               `this.pBind()`
 *   4. selector strings in tests    `By.css('p-tag')`
 * TypeScript reports nothing for groups 2 and 4 — they break silently at runtime.
 *
 * This script scans by POSITIONAL SEMANTICS rather than by text pattern, which closes
 * the whole family at once. Run it as a lint step in CI.
 *
 * Groups 7-9 cover TRADEMARK exposure rather than breakage. They exist because
 * `npm run check` was green while the public API still shipped `providePrimeNG`,
 * `PrimeNGConfigType`, JSDoc links to primeng.org (visible in every consumer's
 * IntelliSense) and a `data-primeng-style-id` attribute written into the consumer's
 * DOM. MIT grants rights to the code, not to the trademarks.
 *
 * Usage:
 *   node tools/codemod/scan-prime-names.mjs            # check, exit 1 on leftovers
 *   node tools/codemod/scan-prime-names.mjs --fix      # fix the auto-fixable groups
 *   node tools/codemod/scan-prime-names.mjs --verbose  # print every location
 *
 * SCOPE. `src/` and `apps/showcase/src/` are strict: any finding fails the build. `attic/`
 * is reported as an inventory only.
 *
 * The showcase was added on 2026-08-24, before inheriting demos from the MIT PrimeNG
 * showcase. It belongs in the strict set for a reason worth stating: a demo file is almost
 * entirely BARE STRINGS — template markup, plus the same text shown to the reader as code to
 * copy — which is the exact shape this whole script exists to catch, and TypeScript reports
 * none of it. It is also the highest-exposure surface in the project: `src/` leaks a name
 * into a consumer's IntelliSense, the showcase leaks it onto the public web. Attic holds unported PrimeNG modules kept verbatim on purpose —
 * their 177 `primeng/*` imports are the point, not a defect, and "fixing" them would
 * destroy the very provenance that makes attic worth keeping. What IS enforced for
 * attic is that nothing in `src/` may import from it (group 10), so attic can never
 * leak into a published build.
 *
 * NEVER touch `p-*` CSS class names — angulux keeps them all by design so themes from
 * @primeuix/themes keep working. The boundary:
 *   `.p-button`  → class, KEEP
 *   `p-button`   in type-selector position → element, RENAME
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ATTRIBUTION_MAX, SIGNAL_PROP_RE, TEMPLATE_ATTR_RE, angularMajorFrom, attributionRanges, exemptionState, templateLiterals } from './name-scan-lib.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'packages/angulux/src');
const ATTIC = join(ROOT, 'packages/angulux/attic');
const SHOWCASE = join(ROOT, 'apps/showcase/src');
const SELECTORS = JSON.parse(readFileSync(join(ROOT, 'tools/codemod/selectors.json'), 'utf8'));
const EXCEPTIONS = JSON.parse(readFileSync(join(ROOT, 'tools/codemod/name-exceptions.json'), 'utf8'));
const angularMajor = () => angularMajorFrom(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));


/**
 * Case-INSENSITIVE lookup, and it has to be: the allowlist records names the way the
 * author typed them in `selector:` (`p-toastItem`, `p-tableHeaderCheckbox`), but the DOM
 * lowercases everything, so tests write `By.css('p-toastitem')` and
 * `hasAttribute('ppassword')`. A case-sensitive lookup would miss exactly those.
 */
const ELEMENTS = new Map(SELECTORS.elementSelectors.map((s) => [s.toLowerCase(), s]));
const ATTRIBUTES = new Map(SELECTORS.attributeSelectors.map((s) => [s.toLowerCase(), s]));

const FIX = process.argv.includes('--fix');
const VERBOSE = process.argv.includes('--verbose');

/** `p-avatarGroup` → `agl-avatarGroup`; keep everything after the prefix. */
const toAglElement = (name) => 'agl-' + name.slice(2);
/**
 * `pTooltip` → `aglTooltip`; `ppassword` → `aglpassword`.
 * Preserve the original casing: an all-lowercase string is a DOM attribute name (the
 * browser already lowercased it), and camelCasing it would read as an alias instead.
 */
const toAglAttribute = (name) => {
    const canonical = ATTRIBUTES.get(name.toLowerCase());
    const agl = 'agl' + canonical[1].toUpperCase() + canonical.slice(2);
    return name === name.toLowerCase() ? agl.toLowerCase() : agl;
};

function walk(dir, out = []) {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        const st = statSync(p);
        if (st.isDirectory()) walk(p, out);
        else if (entry.endsWith('.ts')) out.push(p);
    }
    return out;
}

/** Line number for an offset — reporting only. */
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;


const findings = [];
let SCOPE = 'src';
const record = (file, text, idx, kind, detail, fixable) =>
    findings.push({ file: relative(ROOT, file), line: lineOf(text, idx), kind, detail, fixable, scope: SCOPE });

/**
 * Rewrite names inside ONE CSS selector string.
 * Only touches tokens in type-selector position (not preceded by `.`, `#`, `[`, `-`,
 * or a letter) and tokens inside square brackets. Returns {out, hits}.
 */
function rewriteCssSelector(sel) {
    let hits = 0;
    // type selector: start of string, or after whitespace / combinator / comma / `(`
    let out = sel.replace(/(^|[\s>+~,(])(p-[a-zA-Z][a-zA-Z0-9-]*)/g, (m, pre, name) => {
        if (!ELEMENTS.has(name.toLowerCase())) return m;
        hits++;
        return pre + toAglElement(name);
    });
    // attribute selector: [pFoo] or [pFoo="bar"] — including the all-lowercase form
    out = out.replace(/\[(p[a-zA-Z][a-zA-Z0-9]*)([\]=])/g, (m, name, tail) => {
        if (!ATTRIBUTES.has(name.toLowerCase())) return m;
        hits++;
        return '[' + toAglAttribute(name) + tail;
    });
    return { out, hits };
}

/** Functions whose argument is a CSS selector. */
const SELECTOR_CALLS = /\b(?:By\.css|querySelectorAll|querySelector|closest|matches)\(\s*(['"])((?:(?!\1)[^\\\n]|\\.)*)\1/g;

/**
 * `<ng-content select="p-header">` — content-projection selector.
 * More dangerous than the test group: this is code that RUNS, and when it is wrong the
 * projected header/footer simply vanishes from the DOM with no error thrown.
 */
const NG_CONTENT_SELECT = /select=(['"])((?:(?!\1)[^\\\n])*)\1/g;

/**
 * Group 7 — exported identifiers carrying the PrimeTek trademark.
 * These are what a consumer types in their own source (`inject(PrimeNG)`,
 * `providePrimeNG()`), so they are the highest-exposure surface in the package.
 */
const EXPORTED_DECL = /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm;

/** Group 8 — brand strings in code/JSDoc. Rendered into every consumer's IntelliSense. */
const BRAND_STRING = /prime(?:ng|faces|tek|react|vue)\s*\.\s*(?:org|dev|com|net)|\bprimetek\b/gi;

/** Group 9 — DOM attributes written into the consumer's rendered HTML. */
const BRAND_DOM_ATTR = /\bdata-prime[a-z]*(?:-[a-z]+)*/gi;

/**
 * Attribution regions — see `attributionRanges` in name-scan-lib for what they excuse and why.
 * Every one is printed on every green run: a declared hole in a gate is allowed to exist, and
 * is never allowed to be quiet. Same rule as the accepted-debt banner.
 */
const attributionRegions = [];

function attributionsIn(file, text) {
    const regions = attributionRanges(text);

    for (const region of regions) {
        if (region.size > ATTRIBUTION_MAX) {
            record(file, text, region.start, 'attribution-oversized', `${region.size} chars — the cap is ${ATTRIBUTION_MAX}`, false);
        } else {
            attributionRegions.push({ file: relative(ROOT, file), line: lineOf(text, region.start), size: region.size });
        }
    }

    return regions;
}

const inAttribution = (regions, idx) => regions.some((r) => idx >= r.start && idx < r.end);

for (const [scope, dir] of [
    ['src', SRC],
    ['attic', ATTIC],
    ['showcase', SHOWCASE]
]) {
    SCOPE = scope;
    for (const file of walk(dir)) {
        const original = readFileSync(file, 'utf8');
        let text = original;

        // ── Group 4: CSS selector strings passed to By.css / querySelector / closest ──
        // Auto-fixable: the position is certainly a selector, and a type-selector token
        // cannot be confused with a class name because no dot precedes it.
        text = text.replace(SELECTOR_CALLS, (whole, q, sel, idx) => {
            const { out, hits } = rewriteCssSelector(sel);
            if (!hits) return whole;
            record(file, original, idx, 'css-selector-string', `${sel}  →  ${out}`, true);
            return whole.replace(q + sel + q, q + out + q);
        });

        // ── Group 4b: content-projection selectors in templates ──
        text = text.replace(NG_CONTENT_SELECT, (whole, q, sel, idx) => {
            const { out, hits } = rewriteCssSelector(sel);
            if (!hits) return whole;
            record(file, original, idx, 'ng-content-select', `${sel}  →  ${out}`, true);
            return `select=${q}${out}${q}`;
        });

        // ── Group 4c: DOM attribute names passed to has/get/set/removeAttribute ──
        text = text.replace(/\b(?:has|get|set|remove)Attribute\(\s*(['"])(p[a-zA-Z][a-zA-Z0-9]*)\1/g, (whole, q, name, idx) => {
            if (!ATTRIBUTES.has(name.toLowerCase())) return whole;
            const out = toAglAttribute(name);
            record(file, original, idx, 'dom-attribute-name', `${name}  →  ${out}`, true);
            return whole.replace(q + name + q, q + out + q);
        });

        // ── Group 1: component/directive selector declarations ──
        for (const m of original.matchAll(/selector:\s*(['"])([^'"]+)\1/g)) {
            const { hits, out } = rewriteCssSelector(m[2]);
            const raw = m[2];
            // also report p-* / [pX] tokens NOT in the allowlist — the allowlist can be incomplete
            const stray = /(^|[\s>+~,(])p-[a-zA-Z]/.test(raw) || /\[p[A-Z]/.test(raw);
            if (hits || stray) record(file, original, m.index, 'selector-decl', hits ? `${raw} → ${out}` : `${raw}  (NOT in allowlist)`, false);
        }

        // ── Group 2: @Input/@Output/input()/output() aliases ──
        for (const m of original.matchAll(/(?:@(?:Input|Output)\(\s*(['"])(p[A-Z][a-zA-Z0-9]*)\1|alias:\s*(['"])(p[A-Z][a-zA-Z0-9]*)\3)/g)) {
            record(file, original, m.index, 'input-alias', m[2] ?? m[4], false);
        }

        // ── Group 3: public property names starting with p + uppercase ──
        for (const m of original.matchAll(/@(?:Input|Output)\([^)]*\)\s+(p[A-Z][a-zA-Z0-9]*)\b/g)) {
            record(file, original, m.index, 'public-prop', m[1], false);
        }

        // ── Group 3b: the SIGNAL form of the same thing ──
        // Group 3 required a decorator, and this repo is Angular 22: it writes
        // `pFoo = input()`, not `@Input() pFoo`. Counted in src/ on 2026-08-03: decorator
        // form 0, signal form 16 — so the gate's most important detector was watching a
        // syntax the codebase had almost stopped using, and 16 branded inputs shipped.
        for (const m of original.matchAll(/\b(p[A-Z][a-zA-Z0-9]*)\s*=\s*(?:input|output|model)\b/g)) {
            record(file, original, m.index, 'public-prop-signal', m[1], false);
        }

        // ── Group 11: directive attributes used in inline templates ──
        // Element tags have had a generic net since the beginning (group 6); attributes only
        // ever had the 35-name allowlist, so an unlisted one was invisible. Upstream declares
        // 54 of them. Scoped to template literals — see templateLiterals() for why.
        for (const { start, body } of templateLiterals(original)) {
            for (const m of body.matchAll(TEMPLATE_ATTR_RE)) {
                record(file, original, start + m.index, 'template-attribute', m[1], false);
            }
        }

        // ── Group 5: import paths still pointing at primeng ──
        for (const m of original.matchAll(/(['"])primeng(?:\/[^'"]*)?\1/g)) {
            record(file, original, m.index, 'import-path', m[0], false);
        }

        // ── Group 6: element tags in inline templates ──
        for (const m of original.matchAll(/<(p-[a-zA-Z][a-zA-Z0-9-]*)/g)) {
            record(file, original, m.index, 'template-tag', m[1], false);
        }

        // ── Group 7: exported identifiers carrying the trademark ──
        for (const m of original.matchAll(EXPORTED_DECL)) {
            if (/prime/i.test(m[1])) record(file, original, m.index, 'exported-brand-symbol', m[1], false);
        }

        // ── Group 8: brand strings in code and JSDoc ──
        const attributions = attributionsIn(file, original);

        for (const m of original.matchAll(BRAND_STRING)) {
            if (!inAttribution(attributions, m.index)) record(file, original, m.index, 'brand-string', m[0], false);
        }

        // ── Group 9: brand DOM attributes ──
        for (const m of original.matchAll(BRAND_DOM_ATTR)) {
            if (!inAttribution(attributions, m.index)) record(file, original, m.index, 'brand-dom-attribute', m[0], false);
        }

        // ── Group 10: nothing shipped or published may import from attic ──
        // The showcase is held to this too: a demo importing an unported module would
        // document, on the public web, an API that is not in any release.
        if (scope !== 'attic') {
            for (const m of original.matchAll(/from\s+(['"])[^'"]*\battic\b[^'"]*\1/g)) {
                record(file, original, m.index, 'attic-leak', m[0], false);
            }
        }

        if (FIX && text !== original) writeFileSync(file, text);
    }
}

// ── Report ────────────────────────────────────────────────────────────────
const KIND_LABEL = {
    'css-selector-string': 'CSS selector strings in By.css/querySelector',
    'ng-content-select': 'content-projection selectors',
    'dom-attribute-name': 'DOM attribute names',
    'selector-decl': 'component/directive selector declarations',
    'input-alias': 'string aliases in @Input/@Output',
    'public-prop': 'public property names',
    'import-path': "import paths still pointing at 'primeng'",
    'template-tag': 'element tags in templates',
    'exported-brand-symbol': 'EXPORTED SYMBOLS carrying the PrimeTek trademark',
    'public-prop-signal': 'public signal inputs/outputs (`pFoo = input()`) — invisible to the decorator matcher',
    'template-attribute': 'directive attributes used in inline templates',
    'brand-string': 'brand strings in code/JSDoc (leak into IntelliSense)',
    'brand-dom-attribute': "brand DOM attributes (leak into the consumer's HTML)",
    'attic-leak': 'src/ importing from attic/',
    'attribution-oversized': 'attribution region larger than the cap — narrow it or split it'
};

const allStrictFindings = findings.filter((f) => f.scope !== 'attic');
const atticFindings = findings.filter((f) => f.scope === 'attic');

/**
 * Apply `name-exceptions.json` — and enforce it in both directions, because an exception
 * list nobody checks is the same hazard as the blind spot it was created for.
 *
 * The exemptions are EARNED by `src/`, so the staleness check reads `src/` alone: the debt
 * being accepted is branded names in the PUBLISHED public API, and only src can hold that.
 * They are then HONOURED everywhere, showcase included — a demo of `pButtonLabelPT` has to
 * write `pButtonLabelPT`, because that is the input the shipped library actually has.
 * Folding the showcase into the staleness check instead would let a demo keep an entry alive
 * after src stopped declaring it, which is precisely the quiet state the two-way rule exists
 * to prevent.
 */
const namesInSrc = new Set(findings.filter((f) => f.scope === 'src').map((f) => f.detail));
const { exempt: EXEMPT, problems: listProblems } = exemptionState(EXCEPTIONS, angularMajor(), namesInSrc);
const exempted = allStrictFindings.filter((f) => EXEMPT.has(f.detail));
const strictFindings = allStrictFindings.filter((f) => !EXEMPT.has(f.detail));

const report = (list, header) => {
    const byKind = {};
    for (const f of list) (byKind[f.kind] ??= []).push(f);
    console.log(header);
    for (const [kind, items] of Object.entries(byKind)) {
        const fixed = FIX && items[0].fixable;
        console.log(`${fixed ? '  ✓ fixed' : '  ✗'}  ${KIND_LABEL[kind] ?? kind}: ${items.length}`);
        const show = VERBOSE ? items : items.slice(0, 8);
        for (const f of show) console.log(`        ${f.file}:${f.line}  ${f.detail}`);
        if (!VERBOSE && items.length > show.length) console.log(`        … and ${items.length - show.length} more (--verbose for all)`);
        console.log('');
    }
};

if (atticFindings.length) {
    // Informational only. Attic is verbatim unported upstream code; rewriting it would
    // destroy the provenance that is the whole reason to keep it.
    const byKind = {};
    for (const f of atticFindings) (byKind[f.kind] ??= []).push(f);
    console.log('\n── attic/ inventory (informational — verbatim upstream, not built, not published) ──\n');
    for (const [kind, items] of Object.entries(byKind)) console.log(`  ·  ${KIND_LABEL[kind] ?? kind}: ${items.length}`);
    console.log('');
}

if (exempted.length) {
    // Printed on every green run on purpose. This debt is in the PUBLISHED public API; the
    // one thing it must never do is become quiet.
    const names = [...new Set(exempted.map((f) => f.detail))].sort();
    console.log(`\n⏳ ACCEPTED, NOT FIXED — ${names.length} PrimeNG-branded name(s) still in the public API, ${exempted.length} occurrence(s):\n`);
    console.log(`     ${names.join(' ')}`);
    console.log(`     Renaming them is breaking, and GOVERNANCE.md freezes the ${EXCEPTIONS.untilAngularMajor}.x API.`);
    console.log(`     This list expires by itself when @angular/core moves past ^${EXCEPTIONS.untilAngularMajor} — see tools/codemod/name-exceptions.json.\n`);
}

if (attributionRegions.length) {
    // Printed on every run, green included — a declared hole in a gate must stay visible.
    console.log(`\n📎 ATTRIBUTION REGIONS — ${attributionRegions.length}, where PrimeTek brand PROSE is allowed and nothing else is:\n`);
    for (const r of attributionRegions) console.log(`     ${r.file}:${r.line}  (${r.size} chars)`);
    console.log(`\n     MIT obliges retaining the copyright notice; these are where it is retained.`);
    console.log(`     Selectors, imports and branded API names are still failures inside them.\n`);
}

if (listProblems.length) {
    console.error('\n✗ scan-prime-names: tools/codemod/name-exceptions.json is out of date\n');
    for (const p of listProblems) console.error(`   ${p}`);
    console.error('');
    process.exit(1);
}

if (!strictFindings.length) {
    console.log('✓ scan-prime-names: no PrimeNG names left in selector/API/trademark positions in src/ or apps/showcase/src/.');
    process.exit(0);
}

report(strictFindings, FIX ? '\n── src/ + apps/showcase/src/: FIXED / REMAINING ──\n' : '\n── src/ + apps/showcase/src/: PRIMENG NAMES LEFT ──\n');

const remaining = strictFindings.filter((f) => !(FIX && f.fixable));
if (remaining.length) {
    if (!FIX) console.log('  Run with --fix to fix the auto-fixable groups.\n');
    process.exit(1);
}
console.log('  The remaining groups need a manual fix or an addition to selectors.json.\n');
