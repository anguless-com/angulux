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
    [/@ContentChild\('[a-zA-Z]+'/g, "@ContentChild('x') — decorator query, use contentChild('x')"],
    [/@ContentChild\((?:Header|Footer)\)/g, '@ContentChild(Header|Footer) — the retired facet query'],
    [/@ContentChildren\(AglTemplate\)/g, '@ContentChildren(AglTemplate) — the retired aglTemplate switch'],
    // `_\w*[Tt]emplate`, not `_[a-zA-Z]+Template`: toast's slot is called `template`, with a
    // shadow field named plainly `_template`. Every pattern here assumed the `xTemplate`
    // suffix and was blind to it, so toast read as fully migrated while `_template` survived
    // and `template || _template` silently compared a signal function — always truthy.
    // A type annotation, not merely the name. `dialog` inverts the convention: its
    // `@ContentChild('header')` target is *called* `_headerTemplate`, because the plain
    // `headerTemplate` is taken by a programmatic `@Input()`. Migrating it in place produces
    // `_headerTemplate = contentChild(…)`, which a name-only pattern would report as leftover
    // legacy forever. A shadow field always declares a type; a migrated slot always assigns.
    [/^\s+_\w*[Tt]emplate\s*!?\s*:/gm, '_xTemplate shadow field — the aglTemplate switch target'],
    // Five spellings, every one of them found by being bitten, not by being clever:
    //   `||`             the common form
    //   `??`             menu gated with this; treetable still does
    //   `this._x`        button's gate lives in a TypeScript getter, not a template
    //   `<obj>._x`       tieredmenu reads the parent through a child component:
    //                    `tieredMenu.submenuIconTemplate || tieredMenu._submenuIconTemplate`
    //   lowercase name   toast's slot is `template` / `_template`, no `xTemplate` suffix
    // Each new spelling passed the previous pattern in complete silence. The object prefix is
    // therefore `(?:\w+\.)?` — any receiver, not an enumerated list — because the next module
    // will name its receiver something nobody predicted.
    //   reversed        fileupload wrote `_uploadIconTemplate || uploadIconTemplate` — shadow
    //                   FIRST. A pattern anchored on "shadow second" reads right past it.
    //                   INV-5 caught this one instead, which is the argument for keeping both:
    //                   the spellings keep arriving, the truthiness check does not care.
    //   `this.tt._x`    treetable reads the parent through TWO segments. `(?:\w+\.)?` allows
    //                   one; the receiver is now `(?:\w+\.)*`, because there is no reason the
    //                   chain stops at two either.
    [/(?:(?:\w+\.)*_)?\w*[Tt]emplate\s*(?:\|\||\?\?)\s*(?:\w+\.)*_?\w*[Tt]emplate/g, '`xTemplate || _xTemplate` gate (any `||` / `??` / `<obj>._x` / lowercase / reversed spelling) — the silent-mismatch site'],
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
const MIGRATED_SLOT = /(\w+)\s*=\s*contentChild(?:\.required)?[^(\n]*\(\s*'([a-zA-Z]+)'/g;

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

    // --- INV-5: a migrated slot must never be read in a boolean position without `()`
    //
    // togglebutton's template said `@if (!contentTemplate)` with no `_x` sibling, so no gate
    // pattern touched it. Once the field became a signal that reads `!<function>` — always
    // false — and the entire block, icons and labels included, stopped rendering. TypeScript
    // is silent: a function is a perfectly good truthy value. INV-1 saw no legacy marker and
    // INV-2 saw the slot read elsewhere, so both passed. Only the render tests caught it, and
    // only because this component happened to have some.
    //
    // A name is skipped when the module also declares it as `@Input()` or `@ViewChild` — menu,
    // tieredmenu and toast each pass a plain TemplateRef down to a child input of the same
    // name, and those bare reads are correct.
    const shadowedByInput = (f) => new RegExp(`@(?:Input\\([^)]*\\)|ViewChild\\([^)]*\\))\\s*${f}\\b`).test(srcText);
    for (const { field } of slots) {
        if (shadowedByInput(field)) continue;
        // The receiver is optional and unnamed on BOTH sides of the operator. `scroller`'s
        // style file wrote `!instance.loaderTemplate` — the `!` is there, but `instance.` sits
        // between it and the field, so a pattern expecting `!field` walked straight past. That
        // one shipped in f744616 and left `p-virtualscroller-loader-mask` permanently off.
        // style/*.ts files read component state too; they are not templates, and they were the
        // last place anyone thought to look.
        const boolRead = new RegExp(`!\\s*(?:\\w+\\.)*${field}\\b(?!\\s*\\()|(?:\\w+\\.)*${field}\\s*(?:\\|\\||&&)|(?:\\|\\||&&)\\s*(?:\\w+\\.)*${field}\\b(?!\\s*\\()`, 'g');
        for (const m of srcText.match(boolRead) ?? []) {
            problems.push([`packages/angulux/src/${mod}`, `\`${m.trim()}\` reads the slot without calling it — a signal is always truthy, so this branch silently never changes`]);
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
        // Reading a member the migration deleted. "TypeScript will catch it" is only true when
        // the fixture is typed: password and scroller held `any`-typed instances, so
        // `if (cmp.templates)` compiled into a branch that silently never runs, and
        // `expect(a.templates || b._x || b.loaderIconTemplate)` passed on a signal function
        // being truthy. Both were green and both tested nothing.
        // Only names the migration actually removed. `dialog` inverts the convention, so its
        // slots are still called `_headerTemplate` after migrating — reading one there is
        // correct, and flagging it would teach people the gate cries wolf.
        const liveSlots = new Set(slots.map((s) => s.field));
        for (const m of t.matchAll(/\.(templates|_\w*[Tt]emplate)\b/g)) {
            if (liveSlots.has(m[1])) continue;
            problems.push([rel(f), `spec still reads \`.${m[1]}\` — a member this module's migration deleted; on an \`any\`-typed fixture that compiles and passes while testing nothing`]);
        }
    }
}

// --- INV-6: no source template may still EMIT `aglTemplate=`, in any module
//
// The per-module checks all look inward, and this class of break goes the other way. `table`
// and `treetable` forward icons down into their own `<agl-paginator>` and `<agl-checkbox>`
// with `<ng-template aglTemplate="firstpagelinkicon">`; `paginator` does the same into the
// `<agl-select>` it embeds. The moment the CHILD migrated, those forwards stopped arriving —
// silently, because an unmatched `aglTemplate` is just an ng-template nobody reads. Twenty-seven
// sites across three modules broke that way in f744616, 2d8cc74 and 25cef38, and every
// per-module gate stayed green: the emitting module was still legacy, so nothing examined it,
// and the receiving module's own spec had nothing to say about a parent it never sees.
//
// The rule is therefore global and blunt. Once any module has migrated, the receiving side is
// being dismantled library-wide, and the only safe number of `aglTemplate=` emitters is zero.
// `apps/` is in scope as well, and had to be: the verification app fed `aglTemplate="input"`
// into `agl-treeTableCellEditor`, and a library-only scan called that clean. Consumers live
// outside packages/ — so does the app the browser gate depends on.
if (migratedCount > 0) {
    const roots = [...modules.map((m) => join(SRC, m)), resolve(repoRoot, 'apps')];
    for (const root of roots) {
        let files;
        try {
            files = walk(root);
        } catch {
            continue;
        }
        for (const f of files.filter((x) => (x.endsWith('.ts') || x.endsWith('.html')) && !x.endsWith('.spec.ts') && !x.includes('/node_modules/'))) {
            const t = readFileSync(f, 'utf8');
            for (const m of t.matchAll(/<ng-template[^>]*\saglTemplate="([a-zA-Z]+)"/g)) {
                problems.push([f.slice(repoRoot.length + 1), `emits \`aglTemplate="${m[1]}"\` into a child component — nothing listens for it any more, and an unmatched aglTemplate throws nothing`]);
            }
        }
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
