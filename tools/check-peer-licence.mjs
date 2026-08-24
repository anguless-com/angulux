#!/usr/bin/env node
/**
 * check-peer-licence — the licence question asked about the CONSUMER's install, not ours.
 *
 * WHY THIS EXISTS. `check:license` reads the tree installed here and proves every PrimeTek
 * package in it is on an MIT release. That is the right question about this repository and
 * the wrong one about the published package, because a consumer never installs our tree.
 * They install ours, read its manifest, and their package manager resolves whatever the
 * RANGE in that manifest admits.
 *
 * So there is one surface no gate watched: `"@primeuix/themes": "^2.0.0"` in the published
 * peerDependencies. Today that range is correct — the boundary is `3.0.0`, and a caret on
 * `2.x` cannot reach it. But widening it to `^2 || ^3`, or bumping it the day PrimeTek ships
 * a 3.x feature someone wants, would make angulux's own manifest the thing that instructs a
 * stranger's package manager to install commercially-licensed software. Nothing here would
 * have gone red. The install would simply succeed, on their machine, under our name.
 *
 * WHAT IT CHECKS. Every PrimeTek package named in any workspace manifest — dependencies,
 * peerDependencies, optionalDependencies — plus the built artifact when one is present, and
 * the catalog entries those manifests point at. The range must be PROVABLY entirely below
 * the first commercial release.
 *
 * FAIL-CLOSED, twice over:
 *
 *   • A range shape this script cannot reason about is a failure, not a pass. Only exact
 *     versions, `^` and `~` are provable here; `||`, `>=`, `*` and `x` are refused rather
 *     than approximated. If a future range genuinely needs one of those, teach this script
 *     and its test — do not weaken it into a guess.
 *   • A PrimeTek package the boundary table has never seen is a failure. That is the same
 *     hinge `isPrimeTekPackage` already provides for the installed tree, applied here.
 *
 * The boundary table is NOT duplicated. It comes from
 * `packages/angulux-license-guard/src/boundary.mjs`, the one place a public claim about a
 * third party's licensing is allowed to live.
 *
 * Usage: node tools/check-peer-licence.mjs
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALWAYS_COMMERCIAL, FIRST_COMMERCIAL, TABLE_VERIFIED, isPrimeTekPackage } from '../packages/angulux-license-guard/src/boundary.mjs';
import { parseWorkspace, resolveCatalog } from './workspace-catalog.mjs';
import { compareVersions, staysBelow } from './peer-licence-lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];

const problems = [];
const checked = [];

function inspect(manifestPath) {
    const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const where = relative(ROOT, manifestPath).replace(/\\/g, '/');

    for (const field of FIELDS) {
        for (const [dep, declared] of Object.entries(pkg[field] ?? {})) {
            if (!isPrimeTekPackage(dep)) continue;

            const at = `${where} → ${field}.${dep}`;
            const fromCatalog = resolveCatalog(declared, dep, WORKSPACE);

            if (fromCatalog === undefined && typeof declared === 'string' && declared.startsWith('catalog:')) {
                problems.push(`${at} = "${declared}", but the workspace catalog does not define it`);
                continue;
            }

            const range = fromCatalog ?? declared;

            if (ALWAYS_COMMERCIAL.includes(dep)) {
                problems.push(`${at} — ${dep} is commercial in EVERY version; no range makes it lawful here`);
                continue;
            }

            const boundary = FIRST_COMMERCIAL[dep];

            if (!boundary) {
                problems.push(`${at} — ${dep} is a PrimeTek package the boundary table has never seen (verified ${TABLE_VERIFIED}); add it to boundary.mjs before depending on it`);
                continue;
            }

            const safe = staysBelow(range, boundary);

            if (safe === null) {
                problems.push(`${at} = "${range}" — this script cannot prove an upper bound for that shape. Use an exact version, ^ or ~, or teach check-peer-licence and its test`);
                continue;
            }

            if (!safe) {
                problems.push(`${at} = "${range}" admits ${boundary} and above — ${dep} is commercial from ${boundary}. This manifest would tell a consumer's package manager to install it`);
                continue;
            }

            checked.push(`${at} = "${range}" < ${boundary}`);
        }
    }
}

const WORKSPACE = parseWorkspace(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'));

const manifests = [];

for (const group of ['packages', 'apps']) {
    const dir = join(ROOT, group);

    if (!existsSync(dir)) continue;

    for (const entry of readdirSync(dir)) {
        for (const candidate of [
            join(dir, entry, 'package.json'),
            // The library's published metadata is written from its ROOT manifest, but `src`
            // carries its own copy and the four forks' own files ARE the artifact. Read
            // whichever exist rather than encoding which one wins — this gate has no reason
            // to care, and a rule about which file is authoritative is one more thing to
            // get wrong.
            join(dir, entry, 'src', 'package.json'),
            join(dir, entry, 'dist', 'package.json')
        ]) {
            if (existsSync(candidate)) manifests.push(candidate);
        }
    }
}

manifests.push(join(ROOT, 'package.json'));

for (const manifest of manifests) inspect(manifest);

// The catalog itself, including entries no manifest happens to reference today.
for (const [name, table] of [['catalog', WORKSPACE.catalog], ...Object.entries(WORKSPACE.catalogs).map(([n, t]) => [`catalogs.${n}`, t])]) {
    for (const [dep, version] of Object.entries(table)) {
        if (!isPrimeTekPackage(dep)) continue;

        const boundary = FIRST_COMMERCIAL[dep];
        const at = `pnpm-workspace.yaml → ${name}.${dep}`;

        if (ALWAYS_COMMERCIAL.includes(dep)) {
            problems.push(`${at} — ${dep} is commercial in EVERY version`);
        } else if (!boundary) {
            problems.push(`${at} — unknown to the boundary table (verified ${TABLE_VERIFIED})`);
        } else if (compareVersions(version, boundary) >= 0) {
            problems.push(`${at} = ${version} — commercial from ${boundary}`);
        } else {
            checked.push(`${at} = ${version} < ${boundary}`);
        }
    }
}

if (problems.length) {
    console.error(`\n✗ check-peer-licence: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`   ${p}`);
    console.error('');
    process.exit(1);
}

if (!checked.length) {
    console.error('\n✗ check-peer-licence: found no PrimeTek dependency anywhere — this gate is watching nothing.');
    console.error('   That is either a real independence worth celebrating in the docs, or a broken matcher. Decide which, deliberately.\n');
    process.exit(1);
}

console.log(`✓ check-peer-licence: ${checked.length} PrimeTek range(s), every one provably below its commercial boundary (table verified ${TABLE_VERIFIED}).`);
for (const c of checked) console.log(`    ${c}`);
