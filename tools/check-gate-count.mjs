#!/usr/bin/env node
/**
 * check-gate-count — the guard against a number that lives as a bare string in ten files.
 *
 * WHY THIS EXISTS: `npm run check` is a chain of gates. Its count is quoted in prose ("the
 * seven gates"), in a CI job name (`Gates (7)`), in the README badge (`7/7 gates`), and in
 * the PR template. Every time a gate is added the real number moves and those ten copies do
 * not — the count drifted from 7 to 8 the moment BL-29 added `check:scope-names`, and nobody
 * noticed, because a number in prose is exactly the kind of thing that goes stale silently.
 * This is the same failure class as a renamed selector surviving as a bare string.
 *
 * So the count is DERIVED here — from the one authoritative source, the `check` script in
 * package.json — and every documented copy is checked against it. When they disagree this
 * fails and names each file to fix. It does not edit anything; it refuses to let the drift
 * pass silently.
 *
 * Usage: node tools/check-gate-count.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(resolve(repoRoot, f), 'utf8');

/** The authoritative count: how many `check:*` gates the aggregate `check` script runs. */
const checkScript = JSON.parse(read('package.json')).scripts.check;
const GATES = checkScript.split('&&').filter((s) => /\bnpm run check:/.test(s)).length;

/**
 * Every place the count is written down, and how to read it back out. Each entry's regex has
 * ONE capture group: the number as it appears. A site whose text stops matching (someone
 * reworded it) is itself a failure — the count must stay mechanically checkable, not just
 * happen to be right today.
 */
const SITES = [
    ['.github/workflows/ci.yml', /name:\s*Gates\s*\((\d+)\)/],
    ['.github/workflows/release.yml', /name:\s*Gates\s*\((\d+)\)/],
    ['.github/pull_request_template.md', /(\d+)\/\d+\s+gates/],
    ['README.md', /(\d+)\/\d+\s+gates/],
    ['README.md', /the\s+(\d+)\s+gates/],
    ['CONTRIBUTING.md', /the\s+(\d+)\s+gates/],
    ['SUPPORT.md', /\b(\d+)\s+gates,/],
    ['TRIAGE.md', /the\s+(\d+)\s+gates/],
    ['release/README.md', /\b(\d+)\s+gates/]
];

const problems = [];
for (const [file, rx] of SITES) {
    let text;
    try {
        text = read(file);
    } catch {
        problems.push([file, 'file not found — the gate-count site moved or was deleted']);
        continue;
    }
    const m = text.match(rx);
    if (!m) {
        problems.push([file, `no gate-count phrase matching ${rx} — reword left the count uncheckable`]);
        continue;
    }
    const found = Number(m[1]);
    if (found !== GATES) {
        problems.push([file, `says ${found} gates, but \`npm run check\` runs ${GATES}`]);
    }
}

if (problems.length) {
    console.error(`\n✗ the documented gate count is out of sync (actual: ${GATES})\n`);
    let last = null;
    for (const [file, msg] of problems) {
        if (file !== last) {
            console.error(`  ${file}`);
            last = file;
        }
        console.error(`      ${msg}`);
    }
    console.error(`\n  Update each to ${GATES}, or if you removed a gate, update the \`check\` script.\n`);
    process.exit(1);
}

console.log(`✓ check-gate-count: all ${SITES.length} documented sites agree the suite has ${GATES} gates.`);
