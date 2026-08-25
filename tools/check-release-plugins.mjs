#!/usr/bin/env node
/**
 * check-release-plugins — the guard for a defect that publishes cleanly and is wrong anyway.
 *
 * WHY THIS EXISTS. On 2026-08-25 the `22.2.1` release notes were published with every entry
 * printed twice. Nothing failed: the run was green, the version was right, the tarball was
 * right, and `npm view` agreed. The only broken artifact was the one nobody diffs — the public
 * changelog.
 *
 * The cause was a one-line shape error. `#134` replaced two plugins, `commit-analyzer` and
 * `release-notes-generator`, with a single wrapper that exports BOTH of their steps — but it
 * replaced them one-for-one, leaving the wrapper listed twice. semantic-release runs each step
 * once per entry and CONCATENATES what `generateNotes` returns, so the notes doubled.
 *
 * What makes it worth a gate rather than more care: the evidence was in the log the whole time.
 * Three dry-runs printed `Loaded plugin "analyzeCommits"` twice and the filter's own summary
 * line twice, and three readings — looking for the version number, and finding it correct —
 * went straight past. A number you are hunting for is the one thing you reliably see.
 *
 * Both trains had it. The forks train simply had not released since, so its copy was a defect
 * waiting rather than a defect delivered.
 *
 * The three rules are in `release-plugins-lib.mjs`, shared with the test:
 *
 *   1. DUPLICATE      — no plugin path listed twice in one config.
 *   2. MISSING-FILTER — the rail filter is present, or the train counts every commit again.
 *   3. RAIL           — its `rail` option matches the file it is in, and is a rail that exists.
 *
 * Usage: node tools/check-release-plugins.mjs
 */

import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAILS } from '../release/rails.mjs';
import { analysePlugins, railFromFilename } from './release-plugins-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RELEASE_DIR = join(ROOT, 'release');

// Discovered, not listed. A third train added with a hand-kept list here would be released by
// machinery nothing checks — which is the failure mode this whole family of gates exists for.
const configs = readdirSync(RELEASE_DIR).filter((f) => f.endsWith('.releaserc.json'));

if (!configs.length) {
    console.error('\n✗ check-release-plugins: no *.releaserc.json in release/ — the release trains have no configuration.\n');
    process.exit(1);
}

const knownRails = Object.keys(RAILS);
const problems = [];
const clean = [];

for (const file of configs) {
    const rail = railFromFilename(file);
    let config;

    try {
        // The `//` key holds a comment array, which is valid JSON — no stripping needed.
        config = JSON.parse(readFileSync(join(RELEASE_DIR, file), 'utf8'));
    } catch (error) {
        problems.push([`release/${file}`, `is not valid JSON — ${error.message}`]);
        continue;
    }

    const found = analysePlugins(config, rail, knownRails);

    if (found.length) {
        for (const { rule, message } of found) problems.push([`release/${file}`, `[${rule}] ${message}`]);
    } else {
        clean.push(`release/${file} → rail "${rail}", ${config.plugins.length} plugin(s), no duplicates`);
    }
}

if (problems.length) {
    console.error(`\n✗ check-release-plugins: ${problems.length} problem(s)\n`);

    let last = null;

    for (const [file, message] of problems) {
        if (file !== last) {
            console.error(`  ${file}`);
            last = file;
        }

        console.error(`      ${message}`);
    }

    console.error('');
    process.exit(1);
}

console.log(`✓ check-release-plugins: ${configs.length} train config(s), each with one entry per plugin and the right rail.`);
for (const line of clean) console.log(`    ${line}`);
