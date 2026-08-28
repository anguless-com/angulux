#!/usr/bin/env node
/**
 * set-rail-versions — stamp one version across every package on a release train.
 *
 * WHY THIS EXISTS: a train publishes several packages on one shared version line, which
 * @semantic-release/npm's single `pkgRoot` cannot express. This writes the version
 * semantic-release computed into each package.json during the `prepare` step, before the
 * workflow decides whether a release happened and before the publish step packs anything.
 *
 * WHY IT TAKES A RAIL NAME RATHER THAN A PACKAGE LIST. `set-fork-versions.mjs` hard-codes its
 * four package names, which makes it a THIRD copy of a list `release/rails.mjs` already owns —
 * exactly the drift that file's header was written to end. This one derives the packages from
 * `RAILS[rail]`, so a train cannot stamp a set of packages different from the set its own path
 * gate and commit filter cover.
 *
 * WHY IT HAS A UNIT TEST, unlike most of `release/`. `semantic-release --dry-run` SKIPS the
 * prepare step entirely, so a dry run — the one safe rehearsal this repository has for a
 * release — cannot execute this file at all. A stamper that silently did nothing would leave
 * the manifests unchanged, the workflow's before/after comparison would read "no release
 * warranted", and the run would go green having published nothing while the tag was already
 * pushed. The test beside this file is the only thing standing where the dry run cannot reach.
 *
 * It edits ONLY the `version` field, textually, preserving formatting — a JSON round-trip
 * would reformat hand-maintained files and bury the one line that changed in a diff nobody
 * can review.
 *
 * Usage: node release/set-rail-versions.mjs tools 1.0.1
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAILS } from './rails.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Semver, permissive about prerelease and build metadata, strict about the three numbers. */
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Stamp `version` into every package.json on `rail`.
 *
 * Exported so the test can drive it against a fixture instead of the real tree.
 *
 * @param {string} rail a key of RAILS
 * @param {string} version the version to write
 * @param {string} root repository root; overridden by the test
 * @returns {{stamped: string[], unchanged: string[]}}
 */
export function setRailVersions(rail, version, root = repoRoot) {
    const prefixes = RAILS[rail];

    if (!prefixes) {
        throw new Error(`set-rail-versions: unknown release train "${rail}". Known: ${Object.keys(RAILS).join(', ')}`);
    }

    // A malformed version reaching several manifests at once is expensive, and this script is
    // also run by hand during a recovery — which is exactly when a typo happens.
    if (!SEMVER.test(version ?? '')) {
        throw new Error(`set-rail-versions: "${version}" is not a valid semver version.`);
    }

    const stamped = [];
    const unchanged = [];

    for (const prefix of prefixes) {
        const file = resolve(root, prefix, 'package.json');
        const source = readFileSync(file, 'utf8');
        const match = source.match(/^(\s*)"version"\s*:\s*"([^"]+)"/m);

        if (!match) {
            throw new Error(`set-rail-versions: no "version" field found in ${prefix}package.json`);
        }

        const [, indent, previous] = match;

        if (previous === version) {
            unchanged.push(prefix);
            continue;
        }

        writeFileSync(file, source.replace(/^(\s*)"version"\s*:\s*"[^"]+"/m, `${indent}"version": "${version}"`));
        stamped.push(prefix);
    }

    return { stamped, unchanged };
}

if (process.argv[1] && import.meta.filename.endsWith(process.argv[1].split(/[\\/]/).pop())) {
    const [rail, version] = process.argv.slice(2);

    if (!rail || !version) {
        console.error('✗ set-rail-versions: usage: node release/set-rail-versions.mjs <rail> <version>');
        process.exit(1);
    }

    let result;
    try {
        result = setRailVersions(rail, version);
    } catch (error) {
        console.error(`✗ ${error.message}`);
        process.exit(1);
    }

    for (const prefix of result.unchanged) console.log(`  = ${prefix} already ${version}`);
    for (const prefix of result.stamped) console.log(`  → ${prefix} ${version}`);

    // Stamping nothing is the failure this file's header describes: the workflow would then see
    // no version change, report "no release warranted", and go green having published nothing.
    // Say it here, where the reason is still visible, rather than three steps later.
    if (!result.stamped.length) {
        console.error(`✗ set-rail-versions: every package on "${rail}" was already at ${version}, so nothing was stamped.`);
        console.error('  The workflow decides whether to publish by comparing the manifest before and after');
        console.error('  this step, so it would conclude no release happened. Check the train\'s tag: a rail');
        console.error('  with no tag computes 1.0.0, which is often what the manifests already say.');
        process.exit(1);
    }

    console.log(`✓ set-rail-versions: ${result.stamped.length} package(s) on "${rail}" stamped at ${version}`);
}
