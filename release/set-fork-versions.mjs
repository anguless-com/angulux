#!/usr/bin/env node
/**
 * set-fork-versions — stamp one version across the four forked primeuix packages.
 *
 * WHY THIS EXISTS: the four packages release as a single train on a shared 1.x line, so
 * @semantic-release/npm's single `pkgRoot` cannot express it. This writes the version that
 * semantic-release computed into all four package.json files during the `prepare` step,
 * before @semantic-release/git commits them and before the workflow publishes.
 *
 * It edits ONLY the `version` field, textually, preserving formatting — a JSON round-trip
 * would reformat four hand-maintained files and bury the one line that actually changed in
 * a diff nobody can review.
 *
 * Usage: node release/set-fork-versions.mjs 1.2.0
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGES = ['angulux-styled', 'angulux-utils', 'angulux-styles', 'angulux-motion'];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];

if (!version) {
    console.error('✗ set-fork-versions: no version argument.\n  Usage: node release/set-fork-versions.mjs <version>');
    process.exit(1);
}

// Guard against a malformed value reaching four package.json files at once. semantic-release
// should never pass a bad version, but this script also gets run by hand during a recovery,
// and that is exactly when a typo is expensive.
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
    console.error(`✗ set-fork-versions: "${version}" is not a valid semver version.`);
    process.exit(1);
}

let changed = 0;

for (const name of PACKAGES) {
    const file = resolve(repoRoot, 'packages', name, 'package.json');
    const source = readFileSync(file, 'utf8');

    const match = source.match(/^(\s*)"version"\s*:\s*"([^"]+)"/m);
    if (!match) {
        console.error(`✗ set-fork-versions: no "version" field found in ${name}/package.json`);
        process.exit(1);
    }

    const [, indent, previous] = match;
    if (previous === version) {
        console.log(`  = ${name}: already ${version}`);
        continue;
    }

    writeFileSync(file, source.replace(/^(\s*)"version"\s*:\s*"[^"]+"/m, `${indent}"version": "${version}"`));
    console.log(`  → ${name}: ${previous} → ${version}`);
    changed++;
}

console.log(`✓ set-fork-versions: ${changed} package(s) stamped at ${version}`);
