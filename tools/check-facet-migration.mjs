#!/usr/bin/env node
/**
 * check-facet-migration — the guard for the defect class BL-35 walks straight through.
 *
 * WHY THIS EXISTS: before PA-1 a single slot could be filled three ways — `<ng-template #x>`
 * read by `@ContentChild('x')`, `<ng-template aglTemplate="x">` resolved through an
 * `@ContentChildren(AglTemplate)` switch into a shadow `_xTemplate` field, and an
 * `<agl-header>` facet projected through `<ng-content select>`. Every slot then rendered
 * behind a gate of the form `xTemplate || _xTemplate`.
 *
 * That `||` is the trap. Migrate one half of a module and the gate still evaluates: it simply
 * picks whichever half survived. Nothing throws, the type checker is satisfied, the unit suite
 * stays green, and the slot renders the wrong template — or nothing at all. That is the exact
 * shape of the seven production defects recorded in CONSTITUTION 1.2.1, and it is why P5 says
 * a wide rename MUST be verified by a positional scanner and NEVER declared done because the
 * build is green. During the pilot the unit suite, all gates and the build were green while a
 * card slot rendered empty; only the browser gate noticed.
 *
 * So the invariants here are about STATE, not syntax:
 *
 *   INV-1  A module is either fully legacy or fully migrated — never both. A module holding a
 *          `contentChild` slot AND any legacy marker is half-done, which is the only state in
 *          which the `||` gate can silently disagree with itself.
 *   INV-2  Every migrated slot is actually consumed. A `contentChild('x')` nobody reads is a
 *          slot that renders nothing, forever, with no error — the 1.2.1 failure exactly.
 *   INV-3  A migrated module's spec drives the surviving route only. A spec still feeding
 *          `aglTemplate=` or `<agl-header>` into a migrated component tests a dead path and
 *          will pass for the wrong reason.
 *   INV-4  `AglTemplate`/`Header`/`Footer` stay in `api/shared.ts` exactly as long as some
 *          module still needs them, and must be deleted once none does. This is the closing
 *          condition of the migration, enforced rather than remembered.
 *
 * Usage: node tools/check-facet-migration.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(repoRoot, 'packages/angulux/src');
const SHARED = 'packages/angulux/src/api/shared.ts';

const walk = (dir, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        e.isDirectory() ? walk(p, out) : out.push(p);
    }
    return out;
};

/** Legacy markers — any one of these means the module still carries a retired mechanism. */
const LEGACY = [
    [/@ContentChild\('[a-z]+'/g, "@ContentChild('x') — decorator query, use contentChild('x')"],
    [/@ContentChild\((?:Header|Footer)\)/g, '@ContentChild(Header|Footer) — the retired facet query'],
    [/@ContentChildren\(AglTemplate\)/g, '@ContentChildren(AglTemplate) — the retired aglTemplate switch'],
    [/^\s+_[a-zA-Z]+Template[!:? ]/gm, '_xTemplate shadow field — the aglTemplate switch target'],
    // Three spellings, all found the hard way during the first batch of six modules:
    //   `||`      the common form
    //   `??`      menu gated with this; treetable still does
    //   `this.`   button's gate lives in a TypeScript getter, not a template:
    //             `this.iconTemplate || this._iconTemplate`
    // A pattern written for the first spelling alone passes the other two in silence, which is
    // the same class of miss as a rename codemod that only knows one naming convention.
    [/[a-zA-Z]+Template\s*(?:\|\||\?\?)\s*(?:this\.)?_[a-zA-Z]+Template/g, '`xTemplate || _xTemplate` gate (any of the `||` / `??` / `this._x` spellings) — the silent-mismatch site'],
    [/<ng-content select="agl-(?:header|footer)"/g, '<ng-content select="agl-header|agl-footer"> — the retired facet slot']
];

/**
 * A migrated slot: `someTemplate = contentChild<...>('name', …)`.
 *
 * The generic is skipped with `[^(]*` rather than `<[^>]*>` on purpose. The real declarations
 * read `contentChild<TemplateRef<void>>('header', …)`, and `<[^>]*>` stops at the FIRST `>` —
 * inside `TemplateRef<void` — so the match failed and every migrated module was silently
 * counted as having no slots. This gate then reported green while looking at nothing, which is
 * the very failure mode it was written to prevent. A generic can never contain `(`, so scanning
 * to the opening paren is both simpler and correct.
 */
const MIGRATED_SLOT = /(\w+)\s*=\s*contentChild(?:\.required)?[^(\n]*\(\s*'([a-z]+)'/g;

const modules = readdirSync(SRC, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

const problems = [];
let migratedCount = 0;
let legacyCount = 0;
let slotCount = 0;

for (const mod of modules) {
    const files = walk(join(SRC, mod)).filter((f) => f.endsWith('.ts'));
    const src = files.filter((f) => !f.endsWith('.spec.ts'));
    const specs = files.filter((f) => f.endsWith('.spec.ts'));

    const srcText = src.map((f) => readFileSync(f, 'utf8')).join('\n');
    const rel = (f) => f.slice(repoRoot.length + 1);

    // --- what state is this module in?
    const legacyHits = [];
    for (const [rx, label] of LEGACY) {
        const n = (srcText.match(rx) ?? []).length;
        if (n) legacyHits.push(`${n}× ${label}`);
    }

    const slots = [...srcText.matchAll(MIGRATED_SLOT)].map((m) => ({ field: m[1], name: m[2] }));
    if (!slots.length && !legacyHits.length) continue; // module has no facets at all

    if (slots.length) migratedCount++;
    else legacyCount++;
    slotCount += slots.length;

    // --- INV-1: never both
    if (slots.length && legacyHits.length) {
        problems.push([`packages/angulux/src/${mod}`, `half-migrated — ${slots.length} contentChild slot(s) coexist with:`]);
        for (const h of legacyHits) problems.push([`packages/angulux/src/${mod}`, `    ${h}`]);
        problems.push([`packages/angulux/src/${mod}`, '    a `||` gate across the two halves picks a survivor silently — finish the module or revert it']);
        continue;
    }

    if (!slots.length) continue; // still fully legacy: nothing more to check until it migrates

    // --- INV-2: every migrated slot is read somewhere in the module
    for (const { field, name } of slots) {
        const consumers = (srcText.match(new RegExp(`\\b${field}\\s*\\(`, 'g')) ?? []).length;
        if (consumers === 0) {
            problems.push([`packages/angulux/src/${mod}`, `contentChild('${name}') → \`${field}\` is never read — that slot renders nothing, with no error`]);
        }
    }

    // --- INV-3: a migrated module's spec must not drive the retired routes
    for (const f of specs) {
        const t = readFileSync(f, 'utf8');
        // Positional, not textual. A bare /aglTemplate=/ also matches the prose it lives in —
        // `it('should render aglTemplate="content" …')` — and a gate that fires on its own
        // test names is a gate people learn to switch off. Only an attribute on a real element
        // counts.
        if (/<[a-zA-Z][\w-]*[^>]*\saglTemplate=/.test(t)) problems.push([rel(f), 'spec feeds `aglTemplate=` into a migrated component — it tests a route that no longer exists']);
        if (/<agl-(?:header|footer)[\s>]/.test(t)) problems.push([rel(f), 'spec feeds `<agl-header>`/`<agl-footer>` into a migrated component — the facet route is retired']);
    }
}

// --- INV-4: shared.ts keeps the retired exports exactly while someone still needs them
const sharedText = readFileSync(resolve(repoRoot, SHARED), 'utf8');
const sharedHas = /export class AglTemplate\b/.test(sharedText);
if (legacyCount > 0 && !sharedHas) {
    problems.push([SHARED, `AglTemplate was removed while ${legacyCount} module(s) still depend on it`]);
}
if (legacyCount === 0 && sharedHas) {
    problems.push([SHARED, 'every module has migrated — AglTemplate/Header/Footer must now be deleted, and this gate retired with them']);
}

if (problems.length) {
    console.error('\n✗ the facet migration is in a state that can fail silently\n');
    let last = null;
    for (const [file, msg] of problems) {
        if (file !== last) {
            console.error(`  ${file}`);
            last = file;
        }
        console.error(`      ${msg}`);
    }
    console.error('\n  PA-1 gives each slot exactly one route: `<ng-template #x>` read by');
    console.error('  `contentChild(\'x\')`. A module must cross that line completely or not at all —');
    console.error('  see .agl memory decision-facet-api-mot-cach-duy-nhat-ng-template.\n');
    process.exit(1);
}

console.log(`✓ check-facet-migration: ${migratedCount} module(s) migrated (${slotCount} slots), ${legacyCount} still legacy — none half-done.`);
