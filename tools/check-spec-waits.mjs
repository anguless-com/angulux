#!/usr/bin/env node
/**
 * check-spec-waits — a spec file may not gain a fixed-duration wait.
 *
 * WHY THIS EXISTS: the spec suite arrived with 769 waits shaped like
 * `await new Promise((resolve) => setTimeout(resolve, 100))`. Each is a bet that the duration
 * is enough on the machine that is running. It is enough on an idle one. On a loaded one it is
 * not, and the suite reports a failure in code that is fine: twice on 2026-08-09, on two
 * different tests, while CI stayed green (issue #124). Most have been removed since. Without a
 * check the count grows back one copied test at a time.
 *
 * What it does:
 *
 *   1. Counts the waits in every tracked `*.spec.ts` outside an `attic/`, from the syntax tree
 *      (tools/lib/spec-waits.mjs says what counts and what does not).
 *   2. Holds each file to `tools/spec-waits-baseline.json`. MORE than recorded fails and lists
 *      the lines. A file that is not in the baseline is allowed none.
 *   3. FEWER also fails, until `--prune` gives the allowance back, so the file only shrinks.
 *      `--prune` writes min(recorded, found): it has no way to add a file or raise a number.
 *
 * WHAT TO WRITE INSTEAD: wait for the thing the test asserts. `waitUntil(() => condition,
 * fixture)` and `settled(fixture)` in packages/angulux/src/spec-helpers.ts; `expect.poll` in a
 * Playwright spec; `jasmine.clock()` where a timer of the component has to expire at an exact
 * moment. Very often the answer is no wait at all: `await fixture.whenStable()` is usually on
 * the next line and already does the work.
 *
 * A wait left in the baseline is not always wrong. One armed after a shorter timer the test
 * already started expires later under any load, so it is slow but cannot fail a correct
 * component. The baseline holds those too, because the tree alone cannot tell them apart.
 *
 * Exit codes: 0 = examined and clean · 1 = a new wait, or a stale baseline · 2 = could not
 * examine (no spec files found, or an unreadable baseline).
 *
 * Usage: node tools/check-spec-waits.mjs
 *        node tools/check-spec-waits.mjs --prune    shrink the baseline to what is left
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compare, findWaits, prune } from './lib/spec-waits.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(root, 'tools/spec-waits-baseline.json');
/* The attic holds modules that are not built, and their specs do not run. A module that leaves
   the attic lands in `src/` as a file this baseline has never seen, so it is allowed none: its
   waits are dealt with on the way in. */
const ATTIC = /(^|\/)attic\//;
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

export function main(argv = process.argv.slice(2)) {
    const wantPrune = argv.includes('--prune');

    const files = execFileSync('git', ['ls-files', '-z', '--', '*.spec.ts'], { cwd: root, encoding: 'utf8' })
        .split('\0')
        .filter((file) => file && !ATTIC.test(file));
    if (files.length === 0) {
        console.error('✗ check-spec-waits: git lists no *.spec.ts file. Nothing was examined, which is not the same as clean.');
        return 2;
    }

    const found = {};
    const lines = {};
    for (const file of files) {
        const waits = findWaits(readFileSync(join(root, file), 'utf8'), file);
        if (waits.length) {
            found[file] = waits.length;
            lines[file] = waits;
        }
    }

    let stored;
    try {
        stored = JSON.parse(readFileSync(baselinePath, 'utf8'));
        if (!stored.files || typeof stored.files !== 'object') throw new Error('no "files" object');
    } catch (e) {
        console.error(`✗ check-spec-waits: tools/spec-waits-baseline.json could not be read (${e.message}).`);
        return 2;
    }

    let baseline = stored.files;
    if (wantPrune) {
        const next = prune(baseline, found);
        writeFileSync(baselinePath, JSON.stringify({ $comment: stored.$comment, files: next }, null, 4) + '\n');
        console.log(`✓ check-spec-waits --prune: baseline ${sum(baseline)} → ${sum(next)} frozen wait(s). It can only shrink; nothing was added.`);
        baseline = next;
    }

    const { over, under } = compare(baseline, found);
    if (over.length) {
        console.error(`✗ check-spec-waits: ${over.length} spec file(s) hold more fixed-duration waits than they are allowed:\n`);
        for (const { file, found: n, allowed } of over) {
            console.error(`  ${file}: ${n} found, ${allowed} allowed`);
            for (const w of lines[file]) console.error(`      line ${w.line}: ${w.text.replace(/\s+/g, ' ')}`);
        }
        console.error('\n  Wait for what the test asserts, not for a duration: `waitUntil` / `settled` in');
        console.error('  packages/angulux/src/spec-helpers.ts, `expect.poll` in Playwright, `jasmine.clock()` for an exact');
        console.error('  moment. `setTimeout(resolve, 0)` is not counted. The baseline does not grow.');
        return 1;
    }
    if (under.length) {
        console.error(`✗ check-spec-waits: the baseline is stale — ${under.length} file(s) are allowed more waits than they now have:\n`);
        for (const { file, found: n, allowed } of under) console.error(`  ${file}: ${n} found, ${allowed} allowed`);
        console.error('\n  That is progress. Give the allowance back: `node tools/check-spec-waits.mjs --prune`, and commit the result.');
        return 1;
    }

    console.log(`✓ check-spec-waits: ${files.length} spec files examined, no new fixed-duration wait; ${sum(baseline)} frozen in ${Object.keys(baseline).length} file(s), none over its allowance.`);
    return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main());
