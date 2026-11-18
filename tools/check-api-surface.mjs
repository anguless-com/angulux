#!/usr/bin/env node
/**
 * check-api-surface — the guard behind the API freeze.
 *
 * WHAT IT STOPS: a selector, input, output or template slot that the last release shipped
 * being removed, renamed or retyped on the way to the next one.
 *
 * WHY A GATE: GOVERNANCE.md promises in public that existing component APIs are not
 * redesigned until the next Angular major, and every fix on this line is argued as "does not
 * touch the API surface". Nothing checked that sentence. `check:corpus` proves the corpus
 * equals the source; it is just as green when an input disappears from both. A removed input
 * compiles here, passes every spec that did not use it, and breaks a consumer's template on
 * their next install. So the comparison is made against what consumers actually have: the
 * corpus committed at the most recent `angulux-v*` release tag.
 *
 * THE FIX when it fails: restore the entry. If the break is deliberate and approved (the
 * Angular major trip, or a security fix under the constitution), record it in
 * `tools/api-surface-exceptions.json`:
 *
 *     { "key": "dialog/Dialog input oldName", "change": "removed",
 *       "since": "angulux-v22.6.7", "reason": "why, and the PR that decided it" }
 *
 * `key` and `since` are printed by the failure, ready to paste. An exception holds until the
 * next release becomes the baseline; after that it is reported as expired and can be deleted.
 *
 * WHAT IT DOES NOT CLAIM: the corpus records selectors, inputs, outputs and slots. Public
 * methods, exported types, injection tokens, CSS classes and runtime behaviour are not in it
 * and are not judged here. Additions are listed and never fail: whether a new input belongs
 * on this release line is a review question, and this prints the list so the review has it.
 * A change to the corpus generator that renames entries looks like a mass removal; that is
 * correct (the published corpus is an interface too) and is what the exceptions file is for.
 *
 * Exit codes: 0 = no unrecorded break · 1 = a break, or a bad exceptions file ·
 *             2 = examined nothing (no release tag reachable, or an unreadable corpus).
 *
 * Usage: node tools/check-api-surface.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { surfaceOf, diffSurface, reconcile } from './api-surface-lib.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = 'corpus/corpus.json';
const EXCEPTIONS = 'tools/api-surface-exceptions.json';
const TAG_PATTERN = 'angulux-v*';

const git = (...args) => execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });

function examinedNothing(message) {
    console.error(`\n✗ check-api-surface examined nothing: ${message}\n`);
    process.exit(2);
}

// ---- the baseline: the corpus as the most recent release shipped it ----
let baselineTag;
try {
    baselineTag = git('describe', '--tags', '--match', TAG_PATTERN, '--abbrev=0', 'HEAD').trim();
} catch {
    examinedNothing(
        `no \`${TAG_PATTERN}\` tag is reachable from HEAD, so there is no release to compare with.\n` +
            '  A shallow clone or a fork without tags gets here. Fix:\n' +
            '      git fetch --tags --unshallow https://github.com/anguless-com/angulux.git   (drop --unshallow on a full clone)'
    );
}

let baselineCorpus;
try {
    baselineCorpus = JSON.parse(git('show', `${baselineTag}:${CORPUS}`));
} catch (e) {
    examinedNothing(`${CORPUS} could not be read at ${baselineTag}: ${String(e.message).split('\n')[0]}`);
}

let currentCorpus;
try {
    currentCorpus = JSON.parse(readFileSync(resolve(repoRoot, CORPUS), 'utf8'));
} catch (e) {
    examinedNothing(`${CORPUS} could not be read from the working tree: ${e.message}`);
}

const baseline = surfaceOf(baselineCorpus);
const current = surfaceOf(currentCorpus);
// The floor. An empty surface on either side would make every comparison vacuous: nothing
// removed from nothing is still "no breaks".
if (baseline.size === 0 || current.size === 0) {
    examinedNothing(`the surface is empty (baseline ${baseline.size}, current ${current.size}) — the corpus changed shape and this gate no longer reads it.`);
}

// ---- the exceptions ----
let exceptions;
try {
    exceptions = JSON.parse(readFileSync(resolve(repoRoot, EXCEPTIONS), 'utf8')).exceptions;
    if (!Array.isArray(exceptions)) throw new Error('"exceptions" must be an array');
} catch (e) {
    console.error(`\n✗ check-api-surface: ${EXCEPTIONS} is unreadable — ${e.message}\n`);
    process.exit(1);
}

const { removed, changed, added } = diffSurface(baseline, current);
const { unexcused, excused, unused, expired, malformed } = reconcile([...removed, ...changed], exceptions, baselineTag);

const describe = (b) => (b.change === 'removed' ? `${b.key}   (removed)` : `${b.key}   (changed)\n        was: ${b.was}\n        now: ${b.now}`);

if (unexcused.length || unused.length || malformed.length) {
    console.error(`\n✗ check-api-surface FAILED against ${baselineTag}\n`);
    if (unexcused.length) {
        console.error(`  ${unexcused.length} entr${unexcused.length === 1 ? 'y' : 'ies'} the last release shipped ${unexcused.length === 1 ? 'is' : 'are'} gone or different:\n`);
        for (const b of unexcused) console.error(`      ${describe(b)}`);
        console.error(
            '\n  The public API is frozen until the next Angular major (GOVERNANCE.md). Restore the entry,\n' +
                `  or record an approved break in ${EXCEPTIONS}:\n`
        );
        const b = unexcused[0];
        console.error(`      { "key": "${b.key}", "change": "${b.change}", "since": "${baselineTag}", "reason": "…" }\n`);
    }
    if (unused.length) {
        console.error(`  ${unused.length} exception(s) for ${baselineTag} match no break — delete them, or they will cover the next person who makes it:\n`);
        for (const e of unused) console.error(`      ${e.key}   (${e.change})`);
        console.error('');
    }
    if (malformed.length) {
        console.error(`  ${malformed.length} exception(s) are missing a field. Each needs key, change ("removed" or "changed"), since and reason:\n`);
        for (const e of malformed) console.error(`      ${JSON.stringify(e)}`);
        console.error('');
    }
    process.exit(1);
}

console.log(`✓ check-api-surface: ${baseline.size} selectors, inputs, outputs and slots shipped in ${baselineTag} — none removed or retyped without a record (${current.size} now).`);
if (excused.length) {
    console.log(`    ${excused.length} recorded break(s):`);
    for (const b of excused) console.log(`      ${b.key}   (${b.change})`);
}
if (added.length) {
    console.log(`    ${added.length} addition(s) since ${baselineTag}, for review:`);
    for (const key of added) console.log(`      ${key}`);
}
if (expired.length) {
    console.log(`    ${expired.length} expired exception(s) in ${EXCEPTIONS} (granted against an earlier release) — safe to delete.`);
}
