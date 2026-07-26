#!/usr/bin/env node
/**
 * check-facet-single-route — one route per facet slot, and the retired routes stay retired.
 *
 * WHY THIS EXISTS: a facet slot used to be fillable three ways — `<ng-template #x>` read by
 * `@ContentChild('x')`, `<ng-template aglTemplate="x">` resolved through an
 * `@ContentChildren(AglTemplate)` switch into a shadow `_xTemplate` field, and an `<agl-header>`
 * component projected through `<ng-content select>`. Every slot then rendered behind a gate of
 * the form `xTemplate || _xTemplate`.
 *
 * That `||` was the trap. Touch one half of a module and the gate still evaluates: it simply
 * picks whichever half survived. Nothing throws, the type checker is satisfied, the unit suite
 * stays green, and the slot renders the wrong template — or nothing at all. That is the exact
 * shape of the seven production defects recorded in CONSTITUTION 1.2.1, and it is why P5 says a
 * wide rename MUST be verified by a positional scanner and NEVER declared done because the build
 * is green. During the BL-35 pilot the unit suite, every gate and the build were green while a
 * card slot rendered empty; only the browser gate noticed.
 *
 * BL-35 finished on 2026-07-26 (`d12e3cf`): 31 modules, 191 slots, one route each, and
 * `AglTemplate`/`Header`/`Footer` deleted from `api/shared.ts`. This gate was written as a
 * migration state machine and said so — "retire this gate with them". Standing at the end, that
 * turned out to be half right. The invariants about being MID-migration (fully-legacy XOR
 * fully-migrated; shared.ts keeps the classes while someone needs them) are now vacuous. The
 * ones about the surviving mechanism being used CORRECTLY are not, and two of them have caught
 * real, shipped defects:
 *
 *   - R-3 caught `!instance.loaderTemplate` in `scroller/style/scrollerstyle.ts`, shipped in
 *     f744616, which left `p-virtualscroller-loader-mask` permanently off; and nine more of the
 *     same shape in `table`. None of them depend on `AglTemplate` existing.
 *   - R-4 caught 27 cross-module forwards broken across f744616 / 2d8cc74 / 25cef38. Deleting
 *     the directive class did NOT make those loud: `aglTemplate="x"` is a plain static
 *     attribute, so with no directive to match it Angular still says nothing at all.
 *
 * So the gate was reshaped rather than retired, and renamed to describe what it now enforces.
 * The migration-state invariants became something simpler and stronger: the retired mechanisms
 * are forbidden outright, everywhere under src/, not merely forbidden alongside a migrated slot.
 *
 *   R-1  The three retired mechanisms never come back. Unconditional.
 *   R-2  Every declared slot is actually consumed. A `contentChild('x')` nobody reads is a slot
 *        that renders nothing, forever, with no error — the 1.2.1 failure exactly.
 *   R-3  A slot is never read in a boolean position without calling it. A signal is a function,
 *        so `!x` is always false and `x && …` always proceeds; TypeScript is perfectly happy.
 *   R-4  No template anywhere — library or app — emits `aglTemplate=` into a child component.
 *   R-5  Specs drive the surviving route only, and never read a member the migration deleted.
 *   R-6  `AglTemplate`/`Header`/`Footer` stay deleted from `api/shared.ts`.
 *
 * Usage: node tools/check-facet-single-route.mjs
 */

import { readdirSync, readFileSync } from 'node:fs';
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

/**
 * Comments are prose, and prose is allowed to quote the code it explains.
 *
 * Every pattern below matches raw text, and twice during BL-35 this gate failed on explanatory
 * comments written by the very commit that removed the thing being explained — a component
 * comment naming the retired decorator query, and one describing the `&&` guard it had just
 * dropped. A gate that fires on its own documentation is a gate people learn to switch off, so
 * comments are stripped before matching.
 *
 * Deliberately conservative: block comments, and line comments only where `//` starts the line.
 * A mid-line `//` is usually inside a string (a URL), and eating the rest of that line could
 * hide real code. Stripping can only ever REMOVE matches, never invent them, and a violation
 * never lives in a comment — so the failure mode of being too timid here is nil, while being
 * too greedy would blind the gate.
 */
const stripComments = (t) =>
    t
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^[ \t]*\/\/.*$/gm, ' ');

/** The three retired mechanisms, and the gate shape that let them disagree silently. */
const RETIRED = [
    [/@ContentChild\('[a-zA-Z]+'/g, "@ContentChild('x') — decorator query; the slot API is contentChild('x')"],
    [/@ContentChild\((?:Header|Footer)\)/g, '@ContentChild(Header|Footer) — the retired facet query'],
    [/@ContentChildren\(AglTemplate\)/g, '@ContentChildren(AglTemplate) — the retired aglTemplate switch'],
    // A type annotation, not merely the name. Three modules (`table`, `treetable`, `dialog`)
    // inverted the convention: their `@ContentChild('header')` target was *called*
    // `_headerTemplate`, so migrating in place produced `_headerTemplate = contentChild(…)`,
    // which a name-only pattern would report as leftover legacy forever. A shadow field always
    // declares a type; a migrated slot always assigns.
    // `_\w*[Tt]emplate`, not `_[a-zA-Z]+Template`: toast's slot was called `template`, with a
    // shadow named plainly `_template`, and every suffix-assuming pattern was blind to it.
    [/^\s+_\w*[Tt]emplate\s*!?\s*:/gm, '_xTemplate shadow field — the aglTemplate switch target'],
    // Eleven spellings of the same gate, every one of them found by being bitten:
    //   `||` · `??` (menu) · `this._x` in a TypeScript getter (button) · `<obj>._x` read through
    //   a child component (tieredmenu) · lowercase `template`/`_template` (toast) · reversed
    //   `_x || x` with the shadow FIRST (fileupload) · `this.tt._x` through two segments
    //   (treetable). The receiver is `(?:\w+\.)*` — any depth, unnamed — because the next one
    //   will be named something nobody predicted.
    [/(?:(?:\w+\.)*_)?\w*[Tt]emplate\s*(?:\|\||\?\?)\s*(?:\w+\.)*_?\w*[Tt]emplate/g, '`xTemplate || _xTemplate` gate (any `||` / `??` / receiver / lowercase / reversed spelling) — the silent-mismatch site'],
    [/<ng-content select="agl-(?:header|footer)"/g, '<ng-content select="agl-header|agl-footer"> — the retired facet slot']
];

/**
 * A declared slot: `someTemplate = contentChild<...>('name', …)`.
 *
 * The generic is skipped with `[^(\n]*` rather than `<[^>]*>` on purpose. The real declarations
 * read `contentChild<TemplateRef<void>>('header', …)`, and `<[^>]*>` stops at the FIRST `>` —
 * inside `TemplateRef<void` — so the match failed and every module was silently counted as
 * having no slots. This gate then reported green while looking at nothing, which is the very
 * failure mode it exists to prevent. It happened again on 2026-07-26 from the other side, when
 * `npx prettier` (this repo has no prettier config) rewrote `'header'` as `"header"` and the
 * quote in this pattern stopped matching. Both times the printed COUNT is what gave it away,
 * never the ✓ — which is why the counts below are printed on success.
 */
const SLOT = /(\w+)\s*=\s*contentChild(?:\.required)?[^(\n]*\(\s*'([a-zA-Z]+)'/g;

const modules = readdirSync(SRC, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

const problems = [];
let moduleCount = 0;
let slotCount = 0;
let fileCount = 0;

for (const mod of modules) {
    const files = walk(join(SRC, mod)).filter((f) => f.endsWith('.ts'));
    const src = files.filter((f) => !f.endsWith('.spec.ts'));
    const specs = files.filter((f) => f.endsWith('.spec.ts'));
    fileCount += files.length;

    const srcText = stripComments(src.map((f) => readFileSync(f, 'utf8')).join('\n'));
    const rel = (f) => f.slice(repoRoot.length + 1);
    const where = `packages/angulux/src/${mod}`;

    // --- R-1: the retired mechanisms never come back. Unconditional: they have no callers left,
    //     so any occurrence is a reintroduction, not a leftover.
    for (const [rx, label] of RETIRED) {
        const n = (srcText.match(rx) ?? []).length;
        if (n) problems.push([where, `${n}× ${label}`]);
    }

    const slots = [...srcText.matchAll(SLOT)].map((m) => ({ field: m[1], name: m[2] }));
    if (!slots.length) continue;
    moduleCount++;
    slotCount += slots.length;

    // --- R-2: every declared slot is read somewhere in the module
    for (const { field, name } of slots) {
        if (!new RegExp(`\\b${field}\\s*\\(`, 'g').test(srcText)) {
            problems.push([where, `contentChild('${name}') → \`${field}\` is never read — that slot renders nothing, with no error`]);
        }
    }

    // --- R-3: a slot is only ever read by CALLING it
    //
    // togglebutton's template said `@if (!contentTemplate)` with no sibling to compare against,
    // so no gate pattern touched it. Once the field became a signal that read `!<function>` —
    // always false — and the whole block, icons and labels included, stopped rendering. R-1 saw
    // no retired marker and R-2 saw the slot read elsewhere, so both passed. `scroller`'s style
    // file shipped the same defect as `!instance.loaderTemplate`, which left
    // `p-virtualscroller-loader-mask` permanently off; style/*.ts files read component state too,
    // they are not templates, and they were the last place anyone thought to look.
    //
    // This started as a check for boolean POSITIONS — `!x`, `x &&`, `|| x`. Its own negative test
    // then found the hole: `*ngIf="headerTemplate"` carries no operator at all, is just as
    // silently always-true, and slipped straight through. Enumerating operators was always going
    // to lag reality, so the rule is now the simple one it should have been from the start: a
    // signal is read by calling it, so a bare mention is a bug wherever it appears. Verified
    // against the whole library at the time of writing — 191 slots, zero bare reads — so this
    // costs nothing today and closes the class rather than one shape of it.
    //
    // A name is skipped when the module also declares it as `@Input()` or `@ViewChild`: menu,
    // tieredmenu and toast each pass a plain TemplateRef down to a child input of the same name,
    // and those bare reads are correct.
    const shadowedByInput = (f) => new RegExp(`@(?:Input\\([^)]*\\)|ViewChild\\([^)]*\\))\\s*${f}\\b`).test(srcText);
    for (const { field } of slots) {
        if (shadowedByInput(field)) continue;
        // `(?!\s*[(=])` — not a call, and not the declaration `field = contentChild(…)` itself.
        for (const m of srcText.match(new RegExp(`\\b${field}\\b(?!\\s*[(=])`, 'g')) ?? []) {
            problems.push([where, `\`${m.trim()}\` is read without calling it — a signal is a function, so the value is always truthy and never the template`]);
        }
    }

    // --- R-5: specs drive the surviving route only
    for (const f of specs) {
        const t = stripComments(readFileSync(f, 'utf8'));
        // Positional, not textual. A bare /aglTemplate=/ also matches the prose it lives in —
        // `it('should render aglTemplate="content" …')` — and a gate that fires on its own test
        // names is a gate people learn to switch off. Only an attribute on a real element counts.
        if (/<[a-zA-Z][\w-]*[^>]*\saglTemplate=/.test(t)) problems.push([rel(f), 'spec feeds `aglTemplate=` into a component — it drives a route that no longer exists']);
        if (/<agl-(?:header|footer)[\s>]/.test(t)) problems.push([rel(f), 'spec feeds `<agl-header>`/`<agl-footer>` — the facet components are deleted']);
        // Reading a member the migration removed. "TypeScript will catch it" holds only when the
        // fixture is typed: password and scroller held `any`-typed instances, so
        // `if (cmp.templates)` compiled into a branch that silently never ran, and
        // `expect(a.templates || b._x || b.loaderIconTemplate)` passed on a signal function being
        // truthy. Both were green and both tested nothing.
        // Only names that were actually removed. The three inverted modules still call their
        // slots `_xTemplate`, so reading one there is correct, and flagging it would teach people
        // the gate cries wolf.
        const live = new Set(slots.map((s) => s.field));
        for (const m of t.matchAll(/\.(templates|_\w*[Tt]emplate)\b/g)) {
            if (live.has(m[1])) continue;
            problems.push([rel(f), `spec still reads \`.${m[1]}\` — a member the migration deleted; on an \`any\`-typed fixture that compiles and passes while testing nothing`]);
        }
    }
}

// --- R-4: no source template anywhere may emit `aglTemplate=`
//
// The per-module checks all look inward, and this class of break goes the other way. `table` and
// `treetable` forwarded icons down into their own `<agl-paginator>` and `<agl-checkbox>` with
// `<ng-template aglTemplate="firstpagelinkicon">`; `paginator` did the same into the `<agl-select>`
// it embeds. The moment the CHILD migrated those forwards stopped arriving — silently, because an
// unmatched `aglTemplate` is just an ng-template nobody reads. Twenty-seven sites across three
// modules broke that way, and every per-module gate stayed green: the emitting module was still
// legacy so nothing examined it, and the receiving module's spec had nothing to say about a parent
// it never sees.
//
// Deleting the directive class did not make this loud. `aglTemplate="x"` is a plain static
// attribute, not a binding, so Angular does not complain about it with or without a directive to
// match. `apps/` is in scope and had to be: the verification app fed `aglTemplate="input"` into
// `agl-treeTableCellEditor`, and a library-only scan called that clean. Consumers live outside
// packages/ — so does the app the browser gate depends on.
for (const root of [...modules.map((m) => join(SRC, m)), resolve(repoRoot, 'apps')]) {
    let files;
    try {
        files = walk(root);
    } catch {
        continue;
    }
    for (const f of files.filter((x) => (x.endsWith('.ts') || x.endsWith('.html')) && !x.endsWith('.spec.ts') && !x.includes('/node_modules/') && !x.includes('/dist/'))) {
        for (const m of stripComments(readFileSync(f, 'utf8')).matchAll(/<ng-template[^>]*\saglTemplate="([a-zA-Z]+)"/g)) {
            problems.push([f.slice(repoRoot.length + 1), `emits \`aglTemplate="${m[1]}"\` into a child component — nothing listens for it, and an unmatched aglTemplate throws nothing`]);
        }
    }
}

// --- R-6: the retired classes stay deleted
const shared = stripComments(readFileSync(resolve(repoRoot, SHARED), 'utf8'));
for (const cls of ['AglTemplate', 'Header', 'Footer']) {
    if (new RegExp(`export class ${cls}\\b`).test(shared)) {
        problems.push([SHARED, `\`${cls}\` is back — it was deleted when the last module moved to a single route (BL-35, d12e3cf)`]);
    }
}

if (problems.length) {
    console.error('\n✗ a facet slot has more than one route, or the surviving one is read wrongly\n');
    let last = null;
    for (const [file, msg] of problems) {
        if (file !== last) {
            console.error(`  ${file}`);
            last = file;
        }
        console.error(`      ${msg}`);
    }
    console.error('\n  Each slot has exactly one route: `<ng-template #x>` read by `contentChild(\'x\')`,');
    console.error("  and it must be CALLED wherever it is read — see .agl memory");
    console.error('  decision-facet-api-mot-cach-duy-nhat-ng-template.\n');
    process.exit(1);
}

console.log(`✓ check-facet-single-route: ${slotCount} slots across ${moduleCount} module(s), ${fileCount} files scanned — one route each, all consumed, all called.`);
