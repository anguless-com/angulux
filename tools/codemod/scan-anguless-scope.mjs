#!/usr/bin/env node
/**
 * scan-anguless-scope — the P5 positional guard for the BL-29 scope rename (angulux -> @anguless/*).
 *
 * WHY THIS EXISTS (constitution P5): a wide rename is only "done" when a POSITIONAL scanner says
 * so — never because the build went green. The codemod's own `--verify` proves the diff contains
 * nothing FOREIGN (bijection), but a HALF-applied rename reverses perfectly: reversibility is not
 * completeness. This guard proves completeness — zero bare package names left in a scoped position.
 *
 * THREE CHECKS:
 *   1. Completeness — no quoted `angulux`/`angulux-{fork}` specifier remains unscoped (target: 0).
 *   2. Invariant    — the count of quoted `.p-*` CSS-class strings is unchanged (this rename must
 *                     never touch a selector or CSS class). Baseline measured at rename time.
 *   3. Couplings    — the three sites that string-match the BARE name and are hand-patched (the
 *                     codemod cannot reach them): the tsup `external` regex literal and the
 *                     gen-closure closure regex. (postbuild's dir mapping is behavioural — proven
 *                     by the build + check:publishable at V1, not statically here.)
 *
 * Runs in `npm run check` (gate #8) and before publish. RED until BL-29 B* completes, then GREEN.
 *
 * Usage: node tools/codemod/scan-anguless-scope.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// Same allowlist/anchor as the codemod: a quoted token whose name is EXACTLY one of the five
// published names, then `/subpath` or the closing quote. After scoping, `'@anguless/angulux…'`
// starts with `@`, so this matches ONLY bare (un-scoped) leftovers.
const BARE = /(['"])(angulux(?:-(?:utils|styled|styles|motion))?)((?:\/[^'"]*)?)\1/g;
const P_CLASS = /(['"])\.p-[a-zA-Z0-9_-]+/g;
const P_CLASS_BASELINE = 513; // measured over the scan scope at rename time (BL-29 F2)

const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular', 'attic', 'ref', '.git']);
const SRC_DIRS = ['packages', 'apps/verify'];
const CONFIG_FILES = [
    'package.json', 'tsconfig.json', 'apps/verify/tsconfig.json',
    'packages/angulux/package.json', 'packages/angulux/tsconfig.json',
    'packages/angulux/src/package.json', 'packages/angulux/src/ng-package.json',
    ...['utils', 'styled', 'styles', 'motion'].flatMap((n) => [
        `packages/angulux-${n}/package.json`, `packages/angulux-${n}/tsconfig.json`,
    ]),
    'tools/check-publishable.mjs', 'tools/check-catalog.mjs',
];

function walkTs(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) { if (SKIP_DIRS.has(e.name)) continue; walkTs(path.join(dir, e.name), out); }
        else if (e.name.endsWith('.ts')) out.push(path.join(dir, e.name));
    }
    return out;
}

const files = [...new Set([...SRC_DIRS.flatMap((d) => walkTs(d)), ...CONFIG_FILES.filter((f) => fs.existsSync(f))])];

let bareCount = 0, pClassCount = 0;
const bareByName = {};
const bareSamples = [];
for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(BARE)) {
        bareCount++;
        bareByName[m[2]] = (bareByName[m[2]] || 0) + 1;
        if (bareSamples.length < 12) bareSamples.push(`${path.relative(root, f)}: ${m[0]}`);
    }
    pClassCount += [...t.matchAll(P_CLASS)].length;
}

// Coupling checks — the three bare-name string-match sites the codemod cannot reach.
const couplingFails = [];
for (const n of ['utils', 'styled', 'styles', 'motion']) {
    const p = `packages/angulux-${n}/tsup.config.ts`;
    if (fs.existsSync(p) && /\/\^angulux-/.test(fs.readFileSync(p, 'utf8'))) {
        couplingFails.push(`${p}: tsup external still matches the BARE prefix /^angulux-/ (must be /^@anguless\\/angulux-/)`);
    }
}
const gc = 'tools/scope/gen-closure.mjs';
if (fs.existsSync(gc) && !fs.readFileSync(gc, 'utf8').includes('@anguless/angulux')) {
    couplingFails.push(`${gc}: closure regex does not mention @anguless/angulux — first-party imports won't be detected (closure goes empty)`);
}
// pnpm `--filter angulux` selects by package NAME, so after scoping it must read
// `--filter @anguless/angulux`. The bare form silently matches nothing → build:lib is a no-op.
// (Directory refs `packages/angulux-*` are a different thing and stay unscoped — dirs don't move.)
function walkYml(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walkYml(path.join(dir, e.name), out);
        else if (e.name.endsWith('.yml') || e.name.endsWith('.yaml')) out.push(path.join(dir, e.name));
    }
    return out;
}
for (const p of ['package.json', ...walkYml('.github/workflows')]) {
    if (!fs.existsSync(p)) continue;
    const hits = [...fs.readFileSync(p, 'utf8').matchAll(/--filter[= ]+angulux(?=[\s"'])/g)];
    if (hits.length) couplingFails.push(`${path.relative(root, p)}: ${hits.length}× bare \`--filter angulux\` (pnpm filters by name → must be \`--filter @anguless/angulux\`)`);
}

// ── report ──
let failed = false;

if (bareCount > 0) {
    failed = true;
    console.error(`\n✗ completeness: ${bareCount} bare (un-scoped) package reference(s) remain:`);
    for (const [n, c] of Object.entries(bareByName).sort((a, b) => b[1] - a[1])) console.error(`      ${n.padEnd(16)} ${c}`);
    for (const s of bareSamples) console.error(`      · ${s}`);
    if (bareCount > bareSamples.length) console.error(`      … and ${bareCount - bareSamples.length} more`);
    console.error('  → run: node tools/codemod/scope-anguless.mjs');
} else {
    console.log('✓ completeness: no bare angulux/angulux-* package reference left in any scoped position.');
}

if (pClassCount !== P_CLASS_BASELINE) {
    failed = true;
    console.error(`\n✗ invariant: '.p-*' CSS-class strings = ${pClassCount}, expected ${P_CLASS_BASELINE} (a scope rename must NEVER touch a selector/CSS class).`);
} else {
    console.log(`✓ invariant: '.p-*' CSS-class strings unchanged (${pClassCount}).`);
}

if (couplingFails.length) {
    failed = true;
    console.error('\n✗ couplings: a bare-name string-match site was not updated:');
    for (const c of couplingFails) console.error(`      · ${c}`);
} else {
    console.log('✓ couplings: tsup external + gen-closure closure regex reference the scoped name.');
}

console.log(`\n  scanned ${files.length} file(s)`);
if (failed) process.exit(1);
console.log('✓ scan-anguless-scope: scope rename is complete and positionally sound.');
