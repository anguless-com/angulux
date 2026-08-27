#!/usr/bin/env node
/**
 * scan-anguless-scope — the P5 positional guard for the BL-29 scope rename (angulux -> @anguless/*).
 *
 * WHY THIS EXISTS (constitution P5): a wide rename is only "done" when a POSITIONAL scanner says
 * so — never because the build went green. The codemod's own `--verify` proves the diff contains
 * nothing FOREIGN (bijection), but a HALF-applied rename reverses perfectly: reversibility is not
 * completeness. This guard proves completeness — zero bare package names left in a scoped position.
 *
 * FIVE CHECKS:
 *   1. Completeness — no quoted `angulux`/`angulux-{fork}` specifier remains unscoped, IN THE TS
 *                     AND MANIFEST SCAN SCOPE (target: 0). The scope is printed with the result;
 *                     see the note on claim width below.
 *   2. Invariant    — the count of quoted `.p-*` CSS-class strings is unchanged (this rename must
 *                     never touch a selector or CSS class). Baseline measured at rename time.
 *   3. Couplings    — the sites that string-match the BARE name and are hand-patched (the codemod
 *                     cannot reach them): the tsup `external` regex literal and the gen-closure
 *                     closure regex. (postbuild's dir mapping is behavioural — proven by the build
 *                     + check:publishable at V1, not statically here.)
 *   4. Registry ids — a bare name handed to a REGISTRY-FACING npm subcommand (`npm view angulux@…`,
 *                     `npm deprecate angulux@…`). Added 2026-07-30 after BL-53: `release.yml` ran
 *                     `npm view "angulux@$version"` for months. Nothing is published under the bare
 *                     `angulux`, so npm exited non-zero every time and the duplicate-publish guard
 *                     wrapped around it never fired. Prose that merely mentions "angulux@22.x" is
 *                     not flagged — only a name a TOOL is about to consume.
 *   5. Filters resolve — every `--filter <x>` in the workflows and the root scripts names a real
 *                     workspace package. pnpm prints "No projects matched the filters" and
 *                     **exits 0**, so a filter pointing at a package that was renamed away is a
 *                     silent no-op with a green CI. This replaces an earlier rule that rejected
 *                     bare `--filter angulux` on the stated grounds that it "silently matches
 *                     nothing". Measured 2026-07-30: that is false — pnpm matches a scope-less
 *                     pattern against any scope, and `--filter angulux` selects
 *                     `@anguless/angulux` correctly. The rule was blocking a working command for a
 *                     reason that did not exist; the real hazard is the exit-0 no-match above.
 *
 * ON CLAIM WIDTH (the BL-53 lesson): each line this script prints must describe what it ACTUALLY
 * inspected, not what it is named after. Check 1 previously announced "no bare reference left in
 * any scoped position" while reading only .ts files and a fixed manifest list — which is how three
 * bare names survived in CI shell for months. A guard that overstates its reach is worse than a
 * missing guard: it makes people stop looking.
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
// Measured over the scan scope at rename time (BL-29 F2). It went 513 → 515 on 2026-08-25:
// two `.p-badge` assertions in `badge.spec.ts`, added with the SSR guard to prove the badge
// element is still built in a browser and no longer built on the server. The gate cannot tell
// a new assertion from a rename, and should not try — moving this number is the deliberate act
// it exists to require.
// 515 → 516 on 2026-08-27: one `.p-badge` assertion in `button.spec.ts`, added with the fix
// for the overlay badge being clipped away by `.p-button { overflow: hidden }`. It proves the
// directive still puts the badge inside the inner <button>; the sibling assertion that proves
// it is no longer clipped reads a computed style, not a class string, so it does not count.
// 516 → 518 on 2026-08-27: two more in `togglebutton.spec.ts`. ToggleButton styles its own host
// rather than an inner element, so the host-level unclip does not reach the element that clips
// there; the pair proves the badge lands on the inner span and that nothing between it and the
// page clips it.
// 518 → 520 on 2026-08-27: the badge directive learned to anchor to a custom-element host that
// wears its own root class, so the specs now have to say which element the badge landed on.
// `.p-togglebutton-content` and `.p-badge` in `togglebutton.spec.ts` assert it did NOT land on the
// inner span, and `.p-badge` in `button.spec.ts` asserts a Tailwind `p-4` on the host does not move
// the anchor off the inner button.
const P_CLASS_BASELINE = 520;

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
function walkYml(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walkYml(path.join(dir, e.name), out);
        else if (e.name.endsWith('.yml') || e.name.endsWith('.yaml')) out.push(path.join(dir, e.name));
    }
    return out;
}

// ── check 4: a bare name handed to a registry-facing npm subcommand ──
//
// The BL-53 defect. `npm view angulux@22.0.0-rc.0` asks about a package that does not exist (the
// bare name was refused by npm's typosquat filter and never published), so npm exits non-zero and
// any `if` wrapped around it falls through. Scanned in the files where such a command actually
// runs or is documented for copy-paste, not everywhere the product is mentioned in prose.
const REGISTRY_SUBCMDS = 'view|info|show|publish|unpublish|deprecate|dist-tag|pack|install|i|add';
const NPM_INVOCATION = new RegExp(String.raw`\bnpm\s+(?:-{1,2}\S+\s+)*(?:${REGISTRY_SUBCMDS})\b([^\n]*)`, 'g');
// A bare first-party package name: not already scoped (`@anguless/…`), not a longer name that
// merely starts with it (`angulux-migrate` and `angulux-license-guard` ARE published bare — they
// are the outward-facing tools and must not be flagged).
const BARE_REGISTRY_ID = new RegExp(String.raw`(?<![@\w./-])(angulux(?:-(?:utils|styled|styles|motion))?)(?=@|["'\s]|$)`);

const REGISTRY_ID_SCOPE = [
    ...walkYml('.github/workflows'),
    ...['release/README.md', 'README.md', 'PROVENANCE.md', 'SECURITY.md', 'CONTRIBUTING.md',
        'GOVERNANCE.md', 'SUPPORT.md', '.github/pull_request_template.md'],
].filter((f) => fs.existsSync(f));

// The same defect one layer out: a registry URL — a shields.io badge, or an npmjs.com link —
// naming a package that was never published. This is worse than the command form, not better.
// `npm view` at least exits non-zero; a badge renders `npm | package not found` on the public
// package page and nothing in CI ever looks at it.
//
// Found 2026-08-02 on README.md line 7, pointing at bare `angulux`. It had been wrong since the
// scope rename in #67 and stayed invisible for nine days, because the README only reached
// npmjs.com with the 22.1.0 publish. The five names below are scope-only; `angulux-migrate` and
// `angulux-license-guard` ARE published bare and must not be flagged.
const SCOPED_ONLY = new Set(['angulux', 'angulux-utils', 'angulux-styled', 'angulux-styles', 'angulux-motion']);
const REGISTRY_URL = /(?:npmjs\.com\/package\/|shields\.io\/npm\/[a-z]+\/)([@\w./-]+)/g;

const registryIdFails = [];
for (const p of REGISTRY_ID_SCOPE) {
    const src = fs.readFileSync(p, 'utf8');

    for (const m of src.matchAll(NPM_INVOCATION)) {
        const bare = m[1].match(BARE_REGISTRY_ID);
        if (bare) registryIdFails.push(`${path.relative(root, p)}: \`${m[0].trim().slice(0, 72)}\` → bare \`${bare[1]}\`, must be \`@anguless/${bare[1]}\``);
    }

    for (const m of src.matchAll(REGISTRY_URL)) {
        const name = m[1].replace(/\.svg$/, '').replace(/\/+$/, '');
        if (SCOPED_ONLY.has(name)) {
            registryIdFails.push(`${path.relative(root, p)}: URL \`${m[0].slice(0, 72)}\` → bare \`${name}\`, must be \`@anguless/${name}\``);
        }
    }
}

// ── check 5: every `--filter <x>` names a package that exists ──
//
// pnpm prints "No projects matched the filters" and EXITS 0. A filter left pointing at a name that
// was renamed away is therefore a step that does nothing, in a job that passes. Measured, not
// assumed: a scope-less pattern matches any scope, so `--filter angulux` legitimately selects
// `@anguless/angulux`; `--filter @wrongscope/angulux` and `--filter angulu` match nothing.
const wsNames = new Set();
for (const glob of ['packages', 'apps']) {
    if (!fs.existsSync(glob)) continue;
    for (const e of fs.readdirSync(glob, { withFileTypes: true })) {
        const mf = path.join(glob, e.name, 'package.json');
        if (e.isDirectory() && fs.existsSync(mf)) wsNames.add(JSON.parse(fs.readFileSync(mf, 'utf8')).name);
    }
}
const filterResolves = (token) => wsNames.has(token) ||
    (!token.includes('/') && [...wsNames].some((n) => n.split('/').pop() === token));

const filterFails = [];
let filtersChecked = 0;
for (const p of ['package.json', ...walkYml('.github/workflows')]) {
    if (!fs.existsSync(p)) continue;
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/--filter[= ]+(['"]?)([^\s'"]+)\1/g)) {
        const token = m[2];
        // Path and glob filters are a different mechanism and resolve at run time.
        if (/^[.]{1,3}[/\\]?|[*{]/.test(token)) continue;
        filtersChecked++;
        if (!filterResolves(token)) filterFails.push(`${path.relative(root, p)}: \`--filter ${token}\` matches no workspace package (pnpm would print "No projects matched" and exit 0)`);
    }
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
    console.log(`✓ completeness: no bare angulux/angulux-* specifier in ${files.length} .ts + manifest file(s).`);
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
    console.log('✓ couplings: 4 tsup external regexes + the gen-closure regex reference the scoped name.');
}

if (registryIdFails.length) {
    failed = true;
    console.error(`\n✗ registry ids: ${registryIdFails.length} reference(s) name a package that is not published:`);
    for (const c of registryIdFails) console.error(`      · ${c}`);
    console.error('  A command aimed at an unpublished name does not report "not found" — npm exits');
    console.error('  non-zero and any `if` around it falls through. See BL-53.');
    console.error('  A URL aimed at one is quieter still: the badge just renders "package not');
    console.error('  found" on the public package page, and no gate ever looked at it.');
} else {
    console.log(`✓ registry ids: no bare name in an npm command or a registry URL, across ${REGISTRY_ID_SCOPE.length} workflow + doc file(s).`);
}

if (filterFails.length) {
    failed = true;
    console.error(`\n✗ filters: ${filterFails.length} pnpm filter(s) match no workspace package:`);
    for (const c of filterFails) console.error(`      · ${c}`);
    console.error('  pnpm exits 0 on no-match, so this is a step that does nothing in a job that passes.');
} else {
    console.log(`✓ filters: ${filtersChecked} \`--filter\` token(s) all resolve, against ${wsNames.size} workspace package(s).`);
}

console.log(`\n  scanned ${files.length} .ts/manifest file(s) + ${REGISTRY_ID_SCOPE.length} workflow/doc file(s)`);
if (failed) process.exit(1);
console.log('✓ scan-anguless-scope: 5 checks green — see the header for exactly what each one covers.');
