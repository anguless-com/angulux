#!/usr/bin/env node
/**
 * check-install-scripts — the guard on what is allowed to execute during `pnpm install`.
 *
 * WHY THIS EXISTS: a dependency's install-time lifecycle script is arbitrary code running on
 * whatever machine installs the tree. In this repository that machine is sometimes the
 * release runner — `.github/workflows/release.yml` installs inside the same job that holds
 * `id-token: write`, and GitHub places the OIDC request URL and token in the JOB environment,
 * where every step and every child process can read them. npm Trusted Publishing binds to a
 * repository and a workflow file, so a script running INSIDE that workflow satisfies the
 * binding: a single compromised transitive dependency would be able to mint a publishing
 * credential and ship a package as this project, carrying a valid provenance attestation.
 *
 * The mitigation is `pnpm.onlyBuiltDependencies` in the root manifest — an ALLOWLIST. pnpm
 * refuses to run install scripts for anything not named there, and refusing is silent
 * (pnpm 9 logs the skip at INFO level and exits 0). Silent is exactly why this gate exists:
 * the allowlist protects the tree, and this asserts the allowlist still describes the tree.
 *
 * TWO DIRECTIONS, BOTH FAILURES:
 *   • a package runs an install script and is NOT allowlisted — pnpm is already blocking it,
 *     so nothing is compromised, but somebody has to decide whether it should build. Left
 *     alone this is how a native module comes to be silently unbuilt.
 *   • a package IS allowlisted and no longer runs an install script — a stale exemption. An
 *     allowlist nobody prunes stops being an allowlist and becomes a list.
 *
 * WHAT COUNTS AS AN INSTALL SCRIPT: `preinstall`, `install`, `postinstall`. Deliberately NOT
 * `prepare` or `prepublish` — npm and pnpm run those only for a package installed from a git
 * URL or built from source in the workspace, never for one unpacked from a registry tarball.
 * Counting them would put ~80 packages on this list and train everyone to skim it.
 *
 * WHY IT READS node_modules RATHER THAN THE LOCKFILE: lockfileVersion 9.0 records no
 * `requiresBuild` field at all — pnpm 9 decides at fetch time by inspecting the tarball. The
 * installed tree is the only place the answer exists, which is why this gate refuses to run
 * without one instead of reporting a clean sheet it never looked for.
 *
 * Usage: node tools/check-install-scripts.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIRTUAL_STORE = join(repoRoot, 'node_modules', '.pnpm');

/** The three npm/pnpm lifecycle hooks that fire for a package installed from the registry. */
const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall'];

const manifest = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const allowlist = manifest.pnpm?.onlyBuiltDependencies;

// The policy being absent is the failure this gate is most concerned with: without it pnpm
// runs every install script in the tree, which is the state this whole file exists to end.
if (!Array.isArray(allowlist)) {
    console.error('\n✗ there is no install-script policy\n');
    console.error('  Root package.json has no `pnpm.onlyBuiltDependencies` array, so pnpm will run');
    console.error('  the install script of EVERY dependency — including inside the release job,');
    console.error('  which holds `id-token: write` and can therefore mint an npm credential.\n');
    console.error('  Restore the allowlist. See the header of this file for the full reasoning.\n');
    process.exit(1);
}

// A missing virtual store means this gate cannot answer its own question. Reporting success
// here would be the exact failure this repository has hit before: a check aimed at a path
// that holds nothing does not report "nothing found", it reports success.
if (!existsSync(VIRTUAL_STORE)) {
    console.error('\n✗ check-install-scripts cannot run without an installed tree\n');
    console.error(`  Expected pnpm's virtual store at ${VIRTUAL_STORE}`);
    console.error('  Run `corepack pnpm install --frozen-lockfile` first.\n');
    console.error('  This is deliberately an error and not a skip: the lockfile does not record');
    console.error('  which packages build (lockfileVersion 9.0 has no `requiresBuild`), so an');
    console.error('  uninstalled tree is a question this gate cannot answer, not a clean answer.\n');
    process.exit(1);
}

/** Every package directory inside pnpm's virtual store, scoped names included. */
function* installedPackages() {
    for (const entry of readdirSync(VIRTUAL_STORE)) {
        if (entry.startsWith('.')) continue;
        const base = join(VIRTUAL_STORE, entry, 'node_modules');
        let names;
        try {
            names = readdirSync(base);
        } catch {
            continue;
        }
        for (const name of names) {
            if (!name.startsWith('@')) {
                yield join(base, name);
                continue;
            }
            try {
                for (const scoped of readdirSync(join(base, name))) yield join(base, name, scoped);
            } catch {
                /* a scope directory that vanished mid-walk is not this gate's business */
            }
        }
    }
}

/** name → the hooks it declares, for every installed package that runs code at install time. */
const building = new Map();

for (const dir of installedPackages()) {
    let pkg;
    try {
        pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    } catch {
        continue;
    }
    const hooks = INSTALL_HOOKS.filter((hook) => pkg.scripts?.[hook]);
    if (!hooks.length || !pkg.name) continue;
    if (!building.has(pkg.name)) building.set(pkg.name, { hooks: new Set(), versions: new Set() });
    const record = building.get(pkg.name);
    for (const hook of hooks) record.hooks.add(hook);
    if (pkg.version) record.versions.add(pkg.version);
}

const allowed = new Set(allowlist);
const unlisted = [...building.keys()].filter((name) => !allowed.has(name)).sort();
const stale = [...allowed].filter((name) => !building.has(name)).sort();

if (unlisted.length || stale.length) {
    console.error('\n✗ the install-script allowlist no longer describes the installed tree\n');

    if (unlisted.length) {
        console.error('  Runs an install script, but is NOT allowlisted — pnpm is skipping it:');
        for (const name of unlisted) {
            const { hooks, versions } = building.get(name);
            console.error(`      ${name}@${[...versions].join(', ')} → ${[...hooks].join(', ')}`);
        }
        console.error('');
        console.error('  Decide, one package at a time: does it genuinely need to build on this');
        console.error('  machine? If yes, add it to `pnpm.onlyBuiltDependencies` in package.json in');
        console.error('  its own commit, naming in the message what the script does and why it is');
        console.error('  trusted. If no, leave it blocked — the skip is already keeping you safe.\n');
    }

    if (stale.length) {
        console.error('  Allowlisted, but runs no install script any more — a stale exemption:');
        for (const name of stale) console.error(`      ${name}`);
        console.error('');
        console.error('  Remove it from `pnpm.onlyBuiltDependencies`. Every name left on this list');
        console.error('  after it stops being needed is a name nobody will question later.\n');
    }

    process.exit(1);
}

const total = [...building.values()].reduce((n, { hooks }) => n + hooks.size, 0);
console.log(
    `✓ check-install-scripts: ${building.size} package(s) may run code at install time, ` +
        `all ${building.size} allowlisted (${total} hook(s)); no stale exemptions.`
);
