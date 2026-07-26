#!/usr/bin/env node
/**
 * check-gate-count — the guard against a number that lives as a bare string in ten files.
 *
 * WHY THIS EXISTS: `npm run check` is a chain of gates. Its count is quoted in prose ("the
 * seven gates"), in a CI job name (`Gates (7)`), in the README badge (`7/7 gates`), and in
 * the PR template. Every time a gate is added the real number moves and those copies do
 * not — the count drifted from 7 to 8 the moment BL-29 added `check:scope-names`, and nobody
 * noticed, because a number in prose is exactly the kind of thing that goes stale silently.
 * This is the same failure class as a renamed selector surviving as a bare string.
 *
 * So the count is DERIVED here — from the one authoritative source, the `check` script in
 * package.json — and every documented copy is checked against it. When they disagree this
 * fails and names each file to fix. It does not edit anything; it refuses to let the drift
 * pass silently.
 *
 * ---
 *
 * THREE HOLES THIS GUARD SHIPPED WITH, all found on 2026-07-27 while it was reporting green:
 *
 * 1. It only read DIGITS. README said "Seven gates run on every commit" and "all seven" while
 *    the badge two sections down said "12/12 gates" — the badge was a site, the sentences were
 *    not, and `\d+` cannot see the word "seven". Five spelled-out claims across README and
 *    ci.yml had been wrong since the suite passed eight gates. A guard against stale prose that
 *    ignores prose is decoration, so `NUMBER` now matches either form.
 *
 * 2. It only read the FIRST match per file. A file naming the count twice was checked once,
 *    and the second copy could say anything. Every occurrence is now checked.
 *
 * 3. It counted numbers and never looked at the LIST. README's gate table had SEVEN rows for a
 *    twelve-gate suite; five gates were simply missing, and no number anywhere was wrong about
 *    it. Counting is the weaker question — the table is now compared as a SET against the gate
 *    names in the `check` script, so a missing row, a stale name, or an invented one all fail.
 *
 * The lesson generalises past this file: a number in prose that no machine reads is a number
 * that is already drifting. If it cannot be checked, do not write it down — two derived counts
 * ("the other five") were deleted from README rather than made checkable, because a figure the
 * reader can compute is not worth a guard.
 *
 * Usage: node tools/check-gate-count.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(resolve(repoRoot, f), 'utf8');

/** The authoritative source: the `check:*` gates the aggregate `check` script actually runs. */
const checkScript = JSON.parse(read('package.json')).scripts.check;
const GATE_NAMES = [...checkScript.matchAll(/\bnpm run (check:[\w:-]+)/g)].map((m) => m[1]);
const GATES = GATE_NAMES.length;

/**
 * Number words, so a sentence can be checked as readily as a badge.
 *
 * Capped at twenty deliberately. A suite that outgrows this list should be reporting a
 * numeral, and an unbounded word-to-number parser is more machinery than the problem needs.
 */
const WORDS = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
    'nineteen', 'twenty'
];

/** Matches a count written either way. Used to build every site pattern below. */
const NUMBER = `(\\d+|${WORDS.join('|')})`;

/** Read a captured count back as a number, whichever form it was written in. */
function parseCount(raw) {
    const lower = String(raw).toLowerCase();
    const word = WORDS.indexOf(lower);
    return word === -1 ? Number(lower) : word;
}

/** Build a site regex from a template containing `%N%`, case-insensitive and global. */
const site = (template) => new RegExp(template.replace('%N%', NUMBER), 'gi');

/**
 * Every place the count is written down, and how to read it back out. Each entry's regex has
 * ONE capture group: the number as it appears. A site whose text stops matching (someone
 * reworded it) is itself a failure — the count must stay mechanically checkable, not just
 * happen to be right today.
 */
const SITES = [
    ['.github/workflows/ci.yml', site('name:\\s*Gates\\s*\\(%N%\\)')],
    ['.github/workflows/ci.yml', site('suite is %N% gates')],
    ['.github/workflows/release.yml', site('name:\\s*Gates\\s*\\(%N%\\)')],
    ['.github/pull_request_template.md', site('%N%/\\d+\\s+gates')],
    ['README.md', site('%N%/\\d+\\s+gates')],
    ['README.md', site('the\\s+%N%\\s+gates')],
    ['README.md', site('%N%\\s+gates\\s+run')],
    ['README.md', site('#\\s*all\\s+%N%,')],
    ['CONTRIBUTING.md', site('the\\s+%N%\\s+gates')],
    ['SUPPORT.md', site('\\b%N%\\s+gates,')],
    ['TRIAGE.md', site('the\\s+%N%\\s+gates')],
    ['release/README.md', site('\\b%N%\\s+gates')]
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
    // EVERY occurrence, not just the first. A file that names the count twice used to be
    // checked once, which left the second copy free to say anything at all.
    const hits = [...text.matchAll(rx)];
    if (!hits.length) {
        problems.push([file, `no gate-count phrase matching ${rx.source} — reword left the count uncheckable`]);
        continue;
    }
    for (const m of hits) {
        const found = parseCount(m[1]);
        if (found !== GATES) {
            problems.push([file, `"${m[0].trim()}" says ${found}, but \`npm run check\` runs ${GATES}`]);
        }
    }
}

/**
 * The stronger question: does README LIST every gate, not merely count them right?
 *
 * The count and the list drift independently — README carried a seven-row table while every
 * numeral in the file already said 12. Comparing sets catches the missing row, the renamed
 * gate, and the invented one; comparing counts catches none of the three.
 */
const README_GATE_ROW = /^\|\s*`(check:[\w:-]+)`\s*\|/gm;
const listed = [...read('README.md').matchAll(README_GATE_ROW)].map((m) => m[1]);
const missing = GATE_NAMES.filter((g) => !listed.includes(g));
const extra = listed.filter((g) => !GATE_NAMES.includes(g));
for (const g of missing) problems.push(['README.md', `gate table is missing \`${g}\` — it runs in \`npm run check\``]);
for (const g of extra) problems.push(['README.md', `gate table lists \`${g}\`, which \`npm run check\` does not run`]);

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

console.log(
    `✓ check-gate-count: all ${SITES.length} documented sites agree the suite has ${GATES} gates, ` +
        `and README lists all ${GATES} by name.`
);
