#!/usr/bin/env node
/**
 * check-demo-code — the guard that keeps the documentation site honest about the library.
 *
 * WHY THIS EXISTS. The showcase publishes two things per demo: a component that RUNS, and
 * the code shown to the reader to copy. `build-demos.mjs` derives the second from the first
 * so they cannot drift — but that only holds while the demo files keep the shape the
 * extractor cuts on, and while the page registry keeps pointing at the files it claims to.
 * Neither is something TypeScript can check. A demo whose card div went missing, a registry
 * id that no longer matches the file it loads, a demo for a module the library does not
 * ship — all three compile, all three build green, and all three publish something false.
 *
 * That failure mode is the reason the demos exist in the first place, so it gets a gate
 * rather than a convention. Five checks:
 *
 *   1. SHAPE      — one closing `<div class="card">` per demo, non-empty, no site imports.
 *   2. IDENTITY   — every registry id equals the id derived from the file it actually loads.
 *   3. REACHABLE  — every registry entry resolves to a real file and a real exported class.
 *   4. ORPHANS    — every demo file is referenced by the registry. An unreferenced demo is
 *                   invisible to readers while still costing maintenance, and nothing else
 *                   would ever report it.
 *   5. SCOPE      — every documented module is a module the corpus says the library ships.
 *                   This is what stops `attic/` — 53 unported modules kept verbatim — from
 *                   being documented on the public web as though it were released.
 *
 * Checks 1-4 are structural. Check 5 is the one with teeth: the corpus is the same source
 * `check:corpus` holds to the built library, so "documented" and "shipped" are compared
 * against one authority rather than against each other.
 *
 * Usage: node tools/check-demo-code.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHOWCASE_IMPORT_RE, collectDemoFiles, demoId, extractCard, parseRegistry, readDemo } from '../apps/showcase/scripts/demo-lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOC_DIR = join(ROOT, 'apps/showcase/src/doc');
const REGISTRY = join(DOC_DIR, 'registry.ts');
const CORPUS = join(ROOT, 'corpus/corpus.json');

const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

if (!existsSync(DOC_DIR)) {
    console.log('✓ check-demo-code: no showcase demos yet — nothing to hold to the library.');
    process.exit(0);
}

const shipped = new Set(JSON.parse(readFileSync(CORPUS, 'utf8')).modules.map((m) => m.name));
const files = collectDemoFiles(DOC_DIR);
const sections = parseRegistry(readDemo(REGISTRY));

// ── 1. SHAPE ──────────────────────────────────────────────────────────────────
for (const { id, path } of files) {
    const source = readDemo(path);

    if (SHOWCASE_IMPORT_RE.test(source)) {
        fail(rel(path), 'imports a showcase component — a demo must be copyable verbatim, so it may contain only the demo');
    }

    const { error } = extractCard(source);

    if (error) fail(rel(path), error);

    // Two cards would make "the template" ambiguous, and the extractor would silently take
    // the first. Better to say so than to publish half a demo.
    const cards = source.split('<div class="card').length - 1;

    if (cards > 1) fail(rel(path), `${cards} card divs — a demo shows exactly one`);

    void id;
}

// ── 2, 3. IDENTITY and REACHABLE ──────────────────────────────────────────────
const referenced = new Set();

for (const { module, id, importPath, exportName } of sections) {
    const target = resolve(DOC_DIR, `${importPath}.ts`);
    const where = `registry.ts → ${id}`;

    if (!existsSync(target)) {
        fail(where, `loads '${importPath}', which is not a file`);
        continue;
    }

    referenced.add(target);

    // The id is what the page asks demos.json for, and demos.json is keyed by the FILE's
    // path. If the two disagree, the page renders a demo and shows another demo's code.
    const derived = demoId(module, target.slice(resolve(DOC_DIR, module).length + 1));

    if (derived !== id) {
        fail(where, `id does not match the file it loads — '${importPath}' would be extracted as '${derived}'`);
    }

    const source = readDemo(target);

    if (!new RegExp(`export class ${exportName}\\b`).test(source)) {
        fail(where, `imports { ${exportName} }, which '${importPath}' does not export`);
    }
}

// ── 4. ORPHANS ────────────────────────────────────────────────────────────────
for (const { id, path } of files) {
    if (!referenced.has(path)) {
        fail(rel(path), `demo '${id}' is not in registry.ts — it is built, shipped and unreachable`);
    }
}

// ── 5. SCOPE ──────────────────────────────────────────────────────────────────
const documented = new Set([...files.map((f) => f.module), ...sections.map((s) => s.module)]);

for (const module of documented) {
    if (!shipped.has(module)) {
        fail(`module '${module}'`, 'is documented but is not in the corpus — the site would advertise something no release contains');
    }
}

// A module directory with no demo files at all is a half-finished move, not a state to keep.
for (const entry of readdirSync(DOC_DIR)) {
    const full = join(DOC_DIR, entry);

    if (statSync(full).isDirectory() && !files.some((f) => f.module === entry)) {
        fail(`apps/showcase/src/doc/${entry}/`, 'is a module directory with no demo files');
    }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (problems.length) {
    console.error(`\n✗ check-demo-code: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`   ${p}`);
    console.error('');
    process.exit(1);
}

const modules = [...new Set(files.map((f) => f.module))];

console.log(`✓ check-demo-code: ${files.length} demo(s) across ${modules.length} module(s), all extractable, all reachable, all shipped.`);
