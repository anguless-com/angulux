#!/usr/bin/env node
/**
 * check-risk-coverage — does the browser gate actually exercise the risky decorators?
 *
 * WHY IT EXISTS: a review found the browser gate claiming to cover `table` while touching
 * ZERO of table's three risky decorators. The scenario rendered a flat table and clicked a
 * row; it never constructed `agl-cellEditor` or `agl-columnFilter` at all. The gate stayed
 * green because it had never tried. A mandatory gate whose scope lives only in the memory
 * of whoever wrote it will drift away from the thing it is supposed to guard.
 *
 * HOW: the risky set is RECOMPUTED FROM SOURCE on every run — every `@Component` declaring
 * `ChangeDetectionStrategy.Eager` outside `icons/`, which is exactly the set that used to
 * rely on the framework default that Angular 22 flipped. That set is then reconciled with
 * the `risk-coverage.json` manifest. Adding a new risky decorator without recording how it
 * is covered FAILS the build.
 *
 * The manifest distinguishes two kinds of coverage:
 *   • template   — the verification app constructs it directly; the script also verifies
 *                  that the selector really appears in app.ts
 *   • transitive — another component renders it; the renderer must be named in `renderedBy`
 * There is deliberately no "uncovered" state. Skipping something means editing the
 * manifest, which leaves a decision in the git history instead of a silence.
 *
 * WHAT `renderedBy` USED TO BE WORTH: nothing. Until 2026-08-03 this script checked that
 * the FIELD EXISTED and stopped there — it never asked whether the named parent renders the
 * child, nor whether that parent is reachable from the verification app. Nine of the
 * thirteen risky decorators rested on a hand-typed sentence. Proved by deleting
 * `<agl-tieredmenu>` from app.ts: the gate stayed green.
 *
 * Both entries the first mechanical run rejected were genuinely wrong, and both were wrong
 * in the same direction — the coverage was real, the stated reason was not:
 *   • `agl-motion` claimed `agl-dialog, agl-select, agl-multiselect`. Dialog renders the
 *     `[aglMotion]` DIRECTIVE, a different declaration; select and multiselect never
 *     mention motion at all. The real chain is select/multiselect -> agl-overlay -> motion.
 *   • `agl-treeTableToggler` claimed `agl-treetable`. Treetable does not render it — the
 *     verification app's own body template does, so it was never transitive to begin with.
 *
 * HOW IT IS CHECKED NOW: template containment is computed from source into a graph
 * (component -> the selectors its template mentions), the roots are the tags in app.ts, and
 * reachability is the transitive closure. A `transitive` entry must name a parent that
 * really contains the child AND is really reachable. Multi-hop chains through components
 * that are not themselves risky — `agl-overlay` is the live example — are legitimate and
 * pass; that is how the DOM actually works.
 *
 * Usage: node tools/scope/check-risk-coverage.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(ROOT, 'packages/angulux/src');
const APP = join(ROOT, 'apps/verify/src/app.ts');
const MANIFEST = join(ROOT, 'e2e/risk-coverage.json');

function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(p);
    }
    return out;
}

/** [start, end) of the bracket pair opening at `open`. */
function matchParen(t, open) {
    let d = 0;
    for (let i = open; i < t.length; i++) {
        if (t[i] === '(') d++;
        else if (t[i] === ')') {
            d--;
            if (d === 0) return [open, i + 1];
        }
    }
    return null;
}

/**
 * Every alias a selector declares, as lowercase bare names.
 * `li[aglMultiSelectItem]` -> `aglmultiselectitem`; `agl-treeTableToggler, agl-treetable-toggler`
 * -> both. Lowercasing is correct here: the HTML parser lowercases tags and attributes, so
 * `<agl-treetable>` in a template really does match `selector: 'agl-treeTable'`.
 */
export const aliasesOf = (rawSelector) => [
    ...new Set(
        rawSelector
            .split(',')
            .map((a) => a.trim().replace(/^[a-zA-Z][\w-]*\[/, '[').replace(/^\[|\]$/g, '').split('=')[0].trim().toLowerCase())
            .filter(Boolean)
    )
];

/**
 * The whole reconciliation, as data, so the tests can drive it without spawning a process.
 * Returns the recomputed risky set, the reachable component set, and every problem found.
 */
export function analyze() {
// ── Recompute the risky set, and the whole component graph, from source ────
const risk = new Map(); // key selector -> {file, raw}
const components = []; // every @Component in src: {key, aliases, template}
for (const file of walk(SRC)) {
    const inIcons = relative(SRC, file).split(sep)[0] === 'icons';
    const t = readFileSync(file, 'utf8');
    for (const m of t.matchAll(/@Component\s*\(/g)) {
        const range = matchParen(t, t.indexOf('(', m.index));
        if (!range) continue;
        const body = t.slice(...range);
        const sel = body.match(/selector:\s*['"]([^'"]+)['"]/);
        if (!sel) continue;
        // A selector may list several aliases; the first one is the key.
        const key = sel[1].split(',')[0].trim();
        components.push({ key, aliases: aliasesOf(sel[1]), template: body.toLowerCase() });
        if (inIcons) continue;
        if (!/changeDetection:\s*ChangeDetectionStrategy\.Eager/.test(body)) continue;
        risk.set(key, { file: relative(ROOT, file), raw: sel[1] });
    }
}

const byAlias = new Map(); // lowercase alias -> component
for (const c of components) for (const a of c.aliases) if (!byAlias.has(a)) byAlias.set(a, c);

/** Does `parent`'s template mention any alias of `child`? */
const renders = (parent, child) => child.aliases.some((a) => parent.template.includes(a));

// ── Reconcile against the manifest ────────────────────────────────────────
let manifest;
try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch {
    console.error(`✗ check-risk-coverage: cannot read ${relative(ROOT, MANIFEST)}`);
    process.exit(1);
}

const appText = readFileSync(APP, 'utf8').toLowerCase();
const problems = [];

/** Directly built by the verification app. */
const inApp = (c) => c.aliases.some((a) => appText.includes(a));

/**
 * Everything the verification app can actually reach: start at the tags in app.ts, then
 * follow real template containment until nothing new appears. This is the fact that
 * `renderedBy` used to only assert.
 */
const reachable = new Set(components.filter(inApp));
for (let grew = true; grew; ) {
    grew = false;
    for (const c of components) {
        if (reachable.has(c)) continue;
        for (const parent of reachable) {
            if (!renders(parent, c)) continue;
            reachable.add(c);
            grew = true;
            break;
        }
    }
}

for (const [sel, meta] of risk) {
    const entry = manifest[sel];
    if (!entry) {
        problems.push(`MISSING from the manifest: ${sel}  (${meta.file}) — the browser gate has no idea how to cover it`);
        continue;
    }
    if (!entry.note) problems.push(`${sel}: missing the "note" field explaining how it is covered`);

    const self = byAlias.get(aliasesOf(meta.raw)[0]);
    if (entry.via === 'template') {
        if (!inApp(self)) problems.push(`${sel}: declared "template" but none of its aliases (${self.aliases.join(' | ')}) appear in apps/verify/src/app.ts`);
    } else if (entry.via === 'transitive') {
        if (!entry.renderedBy) {
            problems.push(`${sel}: declared "transitive" but the "renderedBy" field is missing`);
            continue;
        }
        // `renderedBy` is prose — "agl-treetable when scrollable=true" — so take the
        // selector token and drop the human qualifier after it.
        const named = entry.renderedBy.split(',').map((s) => s.trim().replace(/\s+when\s+.*$/i, '').toLowerCase()).filter(Boolean);
        const unknown = named.filter((n) => !byAlias.has(n));
        if (unknown.length) {
            problems.push(`${sel}: "renderedBy" names ${unknown.join(', ')} — no @Component in src declares that selector`);
            continue;
        }
        const parents = named.map((n) => byAlias.get(n));
        const actual = parents.filter((p) => renders(p, self));
        if (!actual.length) {
            problems.push(
                `${sel}: "renderedBy" says ${named.join(', ')}, but no template of theirs mentions ${self.aliases.join(' | ')} — ` +
                    `the claim is not true of the source`
            );
            continue;
        }
        if (!actual.some((p) => reachable.has(p))) {
            problems.push(`${sel}: ${actual.map((p) => p.key).join(', ')} does render it, but nothing in apps/verify/src/app.ts reaches ${actual.length > 1 ? 'any of them' : 'it'}`);
        }
    } else {
        problems.push(`${sel}: the "via" field must be "template" or "transitive", got ${JSON.stringify(entry.via)}`);
    }
}

for (const sel of Object.keys(manifest)) {
    if (!risk.has(sel)) problems.push(`STALE manifest entry: ${sel} — no longer a risky decorator, remove it`);
}

    return { risk, components, byAlias, reachable, manifest, problems, renders, inApp };
}

function main() {
    const { risk, manifest, problems } = analyze();

    if (problems.length) {
        console.error('\n✗ check-risk-coverage: the browser gate scope has drifted from source\n');
        for (const p of problems) console.error(`   ${p}`);
        console.error('');
        process.exit(1);
    }

    const byVia = { template: 0, transitive: 0 };
    for (const sel of risk.keys()) byVia[manifest[sel].via]++;
    console.log(`✓ check-risk-coverage: ${risk.size}/${risk.size} risky decorators are inside the browser gate scope`);
    console.log(`    built directly in the verification app : ${byVia.template}`);
    console.log(`    rendered by another component          : ${byVia.transitive}`);
}

// Importing this module (the test does) must not scan or call process.exit.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
