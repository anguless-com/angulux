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
 *   • transitive — another component renders it; the renderer must be named
 * There is deliberately no "uncovered" state. Skipping something means editing the
 * manifest, which leaves a decision in the git history instead of a silence.
 *
 * Usage: node tools/scope/check-risk-coverage.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ── Recompute the risky set from source ───────────────────────────────────
const risk = new Map(); // normalised selector -> {file, raw}
for (const file of walk(SRC)) {
    if (relative(SRC, file).split(sep)[0] === 'icons') continue;
    const t = readFileSync(file, 'utf8');
    for (const m of t.matchAll(/@Component\s*\(/g)) {
        const range = matchParen(t, t.indexOf('(', m.index));
        if (!range) continue;
        const body = t.slice(...range);
        if (!/changeDetection:\s*ChangeDetectionStrategy\.Eager/.test(body)) continue;
        const sel = body.match(/selector:\s*['"]([^'"]+)['"]/);
        if (!sel) continue;
        // A selector may list several aliases; the first one is the key.
        const key = sel[1].split(',')[0].trim();
        risk.set(key, { file: relative(ROOT, file), raw: sel[1] });
    }
}

// ── Reconcile against the manifest ────────────────────────────────────────
let manifest;
try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch {
    console.error(`✗ check-risk-coverage: cannot read ${relative(ROOT, MANIFEST)}`);
    process.exit(1);
}

const appText = readFileSync(APP, 'utf8');
const problems = [];

for (const [sel, meta] of risk) {
    const entry = manifest[sel];
    if (!entry) {
        problems.push(`MISSING from the manifest: ${sel}  (${meta.file}) — the browser gate has no idea how to cover it`);
        continue;
    }
    if (!entry.note) problems.push(`${sel}: missing the "note" field explaining how it is covered`);
    if (entry.via === 'template') {
        // A selector may have several aliases — the app may use any of them.
        const aliases = meta.raw.split(',').map((a) => a.trim().replace(/^\[|\]$/g, ''));
        const found = aliases.some((a) => appText.includes(a));
        if (!found) problems.push(`${sel}: declared "template" but none of its aliases (${aliases.join(' | ')}) appear in apps/verify/src/app.ts`);
    } else if (entry.via === 'transitive') {
        if (!entry.renderedBy) problems.push(`${sel}: declared "transitive" but the "renderedBy" field is missing`);
    } else {
        problems.push(`${sel}: the "via" field must be "template" or "transitive", got ${JSON.stringify(entry.via)}`);
    }
}

for (const sel of Object.keys(manifest)) {
    if (!risk.has(sel)) problems.push(`STALE manifest entry: ${sel} — no longer a risky decorator, remove it`);
}

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
