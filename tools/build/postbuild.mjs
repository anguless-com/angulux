#!/usr/bin/env node
/**
 * postbuild — turns the build output into a package that is correct for EVERY tool.
 *
 * Adapted from the upstream postbuild script (MIT).
 *
 * Three jobs, none of them optional if the package is going to be published:
 *
 * 1. Copy `LICENSE` and `NOTICE`. LICENSE keeps PrimeTek's copyright notice, which MIT
 *    requires; NOTICE carries the attribution and the trademark disclaimer. Publishing
 *    without either is a license violation, so a missing file fails the build rather than
 *    being skipped.
 *
 * 2. **Resolve the `catalog:` and `workspace:` protocols in the artifact's package.json.**
 *    Both are pnpm-only. `pnpm publish` resolves them; `npm publish` does NOT — it pushes
 *    the literal string `catalog:angular22` to the registry and every install afterwards
 *    fails with `Unsupported URL Type "catalog:"`. Measured directly: `pnpm pack` emits
 *    `^22.0.0`, `npm pack` emits `catalog:angular22`.
 *
 *    Fixed here rather than by "remember to publish with the right command", because
 *    publishing cannot be undone with git — a broken package that reached a registry can
 *    only be replaced by bumping the version. The artifact has to be correct on its own,
 *    independent of who publishes it with which tool.
 *
 * 3. Refuse to emit metadata that publishes successfully and only then reveals the damage
 *    (see the publish-trap block at the end of this file).
 *
 * Usage: PKG_DIR=packages/angulux INPUT_DIR=src/ OUTPUT_DIR=dist/ node tools/build/postbuild.mjs
 */

import fs from 'fs-extra';
import path from 'path';
import { resolvePath } from './build-helper.mjs';

const { __root, __workspace, OUTPUT_PATH } = resolvePath(import.meta.url);

const license = path.resolve(__workspace, 'LICENSE');
if (!fs.existsSync(license)) {
    console.error('✗ postbuild: no LICENSE at the workspace root.');
    console.error('  MIT requires the copyright notice to travel with every copy.');
    console.error('  Publishing without it is a violation — stopping the build.');
    process.exit(1);
}
fs.copySync(license, path.join(OUTPUT_PATH, 'LICENSE'));

/* NOTICE carries the PrimeTek attribution and the non-affiliation statement. MIT does not
   require it, but once this is published it has to ship with the package: LICENSE stays a
   clean MIT text so scanners can match it, and everything else lives here. */
const notice = path.resolve(__workspace, 'NOTICE');
if (!fs.existsSync(notice)) {
    console.error('✗ postbuild: no NOTICE at the workspace root.');
    console.error('  NOTICE carries the PrimeTek attribution and the trademark disclaimer.');
    console.error('  Publishing without it drops exactly the self-protection — stopping.');
    process.exit(1);
}
fs.copySync(notice, path.join(OUTPUT_PATH, 'NOTICE'));

const readme = path.resolve(__root, 'README.md');
if (fs.existsSync(readme)) fs.copySync(readme, path.join(OUTPUT_PATH, 'README.md'));

console.log(`✓ postbuild: copied LICENSE + NOTICE${fs.existsSync(readme) ? ' + README.md' : ''} to ${OUTPUT_PATH}`);

// ── Resolve catalog:/workspace: in the artifact package.json ─────────────────
/**
 * Reads the catalogs out of `pnpm-workspace.yaml` without pulling in a YAML parser.
 * The shape needed is narrow and fixed: `catalog:` (the default one) and `catalogs.<name>:`,
 * each entry a single `'<package>': <version>` line.
 */
function readCatalogs(file) {
    const catalogs = { default: {} };
    let current = null; // null = outside any catalog section
    for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
        const line = raw.replace(/\s+$/, '');
        if (!line || line.trimStart().startsWith('#')) continue;
        const indent = line.length - line.trimStart().length;

        if (indent === 0) {
            if (line.startsWith('catalog:')) current = 'default';
            else if (line.startsWith('catalogs:')) current = '__named__';
            else current = null;
            continue;
        }
        if (!current) continue;

        // Inside `catalogs:`, a line indented 4 spaces and ending in ':' names a catalog.
        const named = line.match(/^\s{2,8}([A-Za-z0-9_-]+):\s*$/);
        if (current === '__named__' && named) {
            current = named[1];
            catalogs[current] ??= {};
            continue;
        }
        const entry = line.match(/^\s+'?([^':]+)'?:\s*(.+?)\s*$/);
        if (entry && current !== '__named__') {
            catalogs[current] ??= {};
            catalogs[current][entry[1].trim()] = entry[2].replace(/^['"]|['"]$/g, '');
        }
    }
    return catalogs;
}

const catalogs = readCatalogs(path.resolve(__workspace, 'pnpm-workspace.yaml'));
const pkgPath = path.join(OUTPUT_PATH, 'package.json');
const pkg = fs.readJsonSync(pkgPath);

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'];
const resolved = [];
const unresolved = [];

/**
 * Resolve `workspace:` — used by the first-party package family (`angulux-utils`,
 * `angulux-styled`, …). pnpm understands the protocol; npm and yarn do NOT, so shipping
 * `workspace:^` unresolved breaks every user install. The version is read from that
 * package's own package.json in the workspace, so there is no second source of truth to
 * drift from.
 *   workspace:^ → ^<version>   ·   workspace:~ → ~<version>   ·   workspace:* → <version>
 */
function resolveWorkspaceSpec(name, spec) {
    const local = path.resolve(__workspace, 'packages', name, 'package.json');
    if (!fs.existsSync(local)) return null;
    const { version } = fs.readJsonSync(local);
    if (!version) return null;
    const range = spec.slice('workspace:'.length);
    if (range === '' || range === '*') return version;
    if (range === '^' || range === '~') return range + version;
    return range; // workspace:1.2.3 — the range is already an explicit version
}

for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
        if (typeof spec !== 'string') continue;

        if (spec.startsWith('catalog:')) {
            const which = spec.slice('catalog:'.length) || 'default';
            const real = catalogs[which]?.[name];
            if (!real) {
                unresolved.push(`${field}.${name} → ${spec} (not present in catalog "${which}")`);
                continue;
            }
            pkg[field][name] = real;
            resolved.push(`${name}: ${spec} → ${real}`);
        } else if (spec.startsWith('workspace:')) {
            const real = resolveWorkspaceSpec(name, spec);
            if (!real) {
                unresolved.push(`${field}.${name} → ${spec} (packages/${name}/package.json missing, or it has no version)`);
                continue;
            }
            pkg[field][name] = real;
            resolved.push(`${name}: ${spec} → ${real}`);
        }
    }
}

if (unresolved.length) {
    console.error('\n✗ postbuild: could not resolve pnpm protocols in the artifact package.json\n');
    for (const u of unresolved) console.error(`   ${u}`);
    console.error('\n  Publishing with these left in place breaks EVERY user install.\n');
    process.exit(1);
}

fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });

/* Final backstop: re-scan the whole written package.json. The step above only handles the
   four known dependency fields; this catches a pnpm protocol that reached some other field
   (`overrides`, `resolutions`) that nobody anticipated. */
const leftover = fs.readFileSync(pkgPath, 'utf8').match(/"(?:catalog|workspace):[^"]*"/g);
if (leftover) {
    console.error('\n✗ postbuild: the artifact package.json STILL contains pnpm-only protocols\n');
    for (const l of [...new Set(leftover)]) console.error(`   ${l}`);
    console.error('\n  npm and yarn do not understand these — the published package will not install.\n');
    process.exit(1);
}

console.log(`✓ postbuild: artifact package.json is free of pnpm protocols (${resolved.length} resolved)`);
for (const r of resolved) console.log(`    ${r}`);

/* ── Publish traps: metadata mistakes that git cannot undo ─────────────────────
   Once a version is published, that version belongs to the registry forever, even after
   an unpublish. Every trap below publishes "successfully" and only then reveals itself:
     - access: restricted   → the package reaches the registry and nobody can install it
     - license other than "MIT" → enterprise scanners read UNKNOWN and block adoption,
                              which is exactly the audience a license-motivated fork needs
     - empty repository     → a bare npm page with no route back to the source
     - empty or non-English description → the first line a stranger reads
   Catching them here is infinitely cheaper than catching them after the upload. */
const traps = [];
if (pkg.license !== 'MIT') traps.push(`license = ${JSON.stringify(pkg.license)} — must be the exact SPDX string "MIT" for scanners to match it`);
if (pkg.publishConfig?.access !== 'public') traps.push(`publishConfig.access = ${JSON.stringify(pkg.publishConfig?.access)} — must be "public", or the package publishes and nobody can install it`);
if (!pkg.repository?.url) traps.push('repository.url is empty — the npm page will have no route back to the source');
/* Tested by code point rather than by literal characters, so this file itself stays ASCII:
   the breve/circumflex/horn/stroke vowels at U+0102-0103, U+00C2/00E2, U+0110-0111,
   U+00CA/00EA, U+00D4/00F4, U+01A0-01A1, U+01AF-01B0, plus the Latin Extended Additional
   block U+1EA0-U+1EF9. Together these are Vietnamese and essentially nothing else. */
const VIETNAMESE = /[\u0102\u0103\u00C2\u00E2\u0110\u0111\u00CA\u00EA\u00D4\u00F4\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]/;
if (!pkg.description || VIETNAMESE.test(pkg.description)) {
    traps.push('description is empty or still Vietnamese — it is the first line a stranger reads on npm');
}

if (traps.length) {
    console.error('\n✗ postbuild: the artifact package.json still contains publish traps\n');
    for (const t of traps) console.error(`   ${t}`);
    console.error('\n  Publishing cannot be undone with git. Fix these before releasing.\n');
    process.exit(1);
}
console.log('✓ postbuild: publish metadata is valid (license MIT · access public · repository · description)');
