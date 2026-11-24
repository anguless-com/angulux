#!/usr/bin/env node
/**
 * check-lint — runs ESLint with the repository's `eslint.config.mjs`, holds the forked code
 * to a frozen baseline, and refuses to call an empty run clean.
 *
 * WHY A WRAPPER and not `eslint .`: three things ESLint does not do on its own.
 *
 *   1. An empty run. ESLint exits 0 when a renamed directory leaves a pattern matching
 *      nothing a config block applies to. This names the trees it expects and fails when
 *      one comes back empty.
 *
 *   2. A baseline that only shrinks. The forked code has thousands of findings that are an
 *      Angular 23 migration, not a defect. `tools/lint-baseline.json` records, per file and
 *      per rule, how many there were on the day it was frozen. More than that fails, and
 *      names the file and the rule. FEWER also fails, until `--prune` gives the allowance
 *      back: otherwise a fix leaves room for the next regression to hide in.
 *
 *   3. No way to grow it. `--prune` writes min(recorded, found) and drops files that are
 *      gone; it cannot raise a number or add a file. Raising one is an edit to the JSON by
 *      hand, which is a diff a reviewer sees, and that is the point.
 *
 * A focused test is never covered by the baseline, in any tree.
 *
 * KNOWN COST: the baseline is keyed by path, so moving a forked file moves its findings to
 * a path with no allowance. Move the entry in the JSON in the same commit.
 *
 * Exit codes: 0 = examined and clean · 1 = findings, or a stale baseline · 2 = could not
 * examine (ESLint missing or crashed, a file that does not parse, an empty tree, or an
 * unreadable baseline).
 *
 * Usage: node tools/check-lint.mjs            the gate
 *        node tools/check-lint.mjs --prune    shrink the baseline to what is left
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, sep, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compare, prune, ruleKey, countFindings } from './lib/lint-baseline.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(root, 'tools/lint-baseline.json');
const wantPrune = process.argv.includes('--prune');

/** The forked code that is held to the baseline. Kept in step with eslint.config.mjs. */
const FORKED = ['packages/angulux/src', 'packages/angulux-utils/src', 'packages/angulux-styled/src', 'packages/angulux-styles/src', 'packages/angulux-motion/src', 'packages/angulux-themes/src'];
const isForked = (file) => FORKED.some((dir) => file.startsWith(`${dir}/`));

/** Each tree the gate promises to look at. */
const TREES = [
    { name: 'apps/showcase', patterns: ['apps/showcase/**/*.ts', 'apps/showcase/**/*.html'], owns: (f) => f.startsWith('apps/showcase/') },
    { name: 'apps/verify', patterns: ['apps/verify/**/*.ts', 'apps/verify/**/*.html'], owns: (f) => f.startsWith('apps/verify/') },
    { name: 'e2e', patterns: ['e2e/**/*.ts'], owns: (f) => f.startsWith('e2e/') },
    { name: 'forked packages', patterns: FORKED.map((dir) => `${dir}/**/*.ts`), owns: isForked }
];

export async function main() {
    let ESLint;
    try {
        ({ ESLint } = await import('eslint'));
    } catch (e) {
        console.error(`✗ check-lint: ESLint could not be loaded (${e.code ?? e.message}). Run \`corepack pnpm install\`; nothing was examined.`);
        return 2;
    }

    let results;
    try {
        const eslint = new ESLint({ cwd: root, errorOnUnmatchedPattern: true });
        results = await eslint.lintFiles(TREES.flatMap((t) => t.patterns));
    } catch (e) {
        console.error(`✗ check-lint: ESLint did not complete — ${e.message}`);
        return 2;
    }

    const rel = (file) => relative(root, file).split(sep).join('/');
    const counts = TREES.map((t) => ({ name: t.name, files: results.filter((r) => t.owns(rel(r.filePath))).length }));
    const empty = counts.filter((c) => c.files === 0);
    if (empty.length) {
        console.error(`✗ check-lint: no file examined under ${empty.map((c) => c.name).join(', ')} — the tree moved or the patterns no longer match it.`);
        return 2;
    }
    const summary = counts.map((c) => `${c.files} in ${c.name}`).join(', ');

    const show = (file, m) => `   ${file}:${m.line ?? 0}:${m.column ?? 0}  ${m.message}  [${ruleKey(m)}]`;
    const unparsed = [];
    const direct = []; // findings no baseline may cover
    const forked = []; // { file, messages } for the baseline to judge
    for (const r of results) {
        const file = rel(r.filePath);
        const fatal = r.messages.filter((m) => m.fatal);
        if (fatal.length) {
            unparsed.push(...fatal.map((m) => `   ${file}:${m.line ?? 0}:${m.column ?? 0}  ${m.message}`));
            continue;
        }
        if (!isForked(file)) {
            direct.push(...r.messages.map((m) => show(file, m)));
            continue;
        }
        const focused = r.messages.filter((m) => ruleKey(m) === 'no-restricted-syntax/focused-test');
        direct.push(...focused.map((m) => show(file, m)));
        forked.push({ file, messages: r.messages.filter((m) => !focused.includes(m)) });
    }

    if (unparsed.length) {
        console.error(`✗ check-lint: ${unparsed.length} file(s) could not be parsed, so they were not examined:\n`);
        for (const l of unparsed) console.error(l);
        return 2;
    }

    let baseline;
    try {
        baseline = JSON.parse(readFileSync(baselinePath, 'utf8')).files;
        if (!baseline || typeof baseline !== 'object') throw new Error('no "files" object');
    } catch (e) {
        console.error(`✗ check-lint: tools/lint-baseline.json could not be read (${e.message}). Without it the forked code cannot be judged.`);
        return 2;
    }

    const found = countFindings(forked);
    const frozen = Object.values(baseline).reduce((n, rules) => n + Object.values(rules).reduce((a, b) => a + b, 0), 0);

    if (wantPrune) {
        const next = prune(baseline, found);
        const left = Object.values(next).reduce((n, rules) => n + Object.values(rules).reduce((a, b) => a + b, 0), 0);
        writeFileSync(baselinePath, JSON.stringify({ $comment: JSON.parse(readFileSync(baselinePath, 'utf8')).$comment, files: next }, null, 4) + '\n');
        console.log(`✓ check-lint --prune: baseline ${frozen} → ${left} frozen finding(s). It can only shrink; nothing was added.`);
    }

    const verdict = compare(wantPrune ? prune(baseline, found) : baseline, found);
    const over = [];
    for (const o of verdict.over) {
        over.push(`   ${o.file}  [${o.rule}]  ${o.found} found, ${o.allowed} frozen:`);
        const lines = forked.find((f) => f.file === o.file).messages.filter((m) => ruleKey(m) === o.rule);
        for (const m of lines.slice(0, 6)) over.push(`       ${m.line ?? 0}:${m.column ?? 0}  ${m.message}`);
        if (lines.length > 6) over.push(`       … and ${lines.length - 6} more`);
    }

    if (direct.length || over.length) {
        console.error(`✗ check-lint: ${direct.length + verdict.over.length} problem(s) in ${results.length} files (${summary}):\n`);
        for (const l of direct) console.error(l);
        if (over.length) {
            console.error('\n  Forked code, over its frozen baseline (new findings are among the lines listed):\n');
            for (const l of over) console.error(l);
        }
        console.error('\n  Fix the code. An `eslint-disable` comment has no effect here, and the baseline does not grow.');
        return 1;
    }
    if (verdict.under.length) {
        console.error(`✗ check-lint: the baseline is stale — ${verdict.under.length} entr(ies) allow more than the code now has:\n`);
        for (const u of verdict.under.slice(0, 20)) console.error(`   ${u.file}  [${u.rule}]  ${u.found} found, ${u.allowed} frozen`);
        if (verdict.under.length > 20) console.error(`   … and ${verdict.under.length - 20} more`);
        console.error('\n  That is progress. Give the allowance back: `node tools/check-lint.mjs --prune`, and commit the result.');
        return 1;
    }

    const live = wantPrune ? Object.values(prune(baseline, found)).reduce((n, rules) => n + Object.values(rules).reduce((a, b) => a + b, 0), 0) : frozen;
    console.log(`✓ check-lint: ${results.length} files examined (${summary}), no new finding; ${live} frozen in the forked code, none over its allowance.`);
    return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main());
