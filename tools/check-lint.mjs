#!/usr/bin/env node
/**
 * check-lint — runs ESLint with the repository's `eslint.config.mjs` and refuses to call an
 * empty run clean.
 *
 * WHY A WRAPPER and not `eslint .`: ESLint exits 0 when the patterns it was given match
 * files that no config block applies to, and a renamed directory turns a gate into a
 * no-op that still prints nothing and still passes. This names the trees it expects to
 * examine and fails when any of them came back empty.
 *
 * The rules, their scope and what was deliberately left off are in `eslint.config.mjs`.
 *
 * Exit codes: 0 = examined and clean · 1 = findings · 2 = could not examine (ESLint missing
 * or crashed, a file that does not parse, or a tree with no files).
 *
 * Usage: node tools/check-lint.mjs
 */

import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Each tree the gate promises to look at: a label, the patterns, and how to recognise a file of it. */
const TREES = [
    { name: 'apps/showcase', patterns: ['apps/showcase/**/*.ts', 'apps/showcase/**/*.html'], owns: (f) => f.startsWith('apps/showcase/') },
    { name: 'apps/verify', patterns: ['apps/verify/**/*.ts', 'apps/verify/**/*.html'], owns: (f) => f.startsWith('apps/verify/') },
    { name: 'e2e', patterns: ['e2e/**/*.ts'], owns: (f) => f.startsWith('e2e/') },
    { name: 'package specs', patterns: ['packages/**/*.spec.ts'], owns: (f) => f.startsWith('packages/') }
];

let ESLint;
try {
    ({ ESLint } = await import('eslint'));
} catch (e) {
    console.error(`✗ check-lint: ESLint could not be loaded (${e.code ?? e.message}). Run \`corepack pnpm install\`; nothing was examined.`);
    process.exit(2);
}

let results;
try {
    const eslint = new ESLint({ cwd: root, errorOnUnmatchedPattern: true });
    results = await eslint.lintFiles(TREES.flatMap((t) => t.patterns));
} catch (e) {
    console.error(`✗ check-lint: ESLint did not complete — ${e.message}`);
    process.exit(2);
}

const rel = (file) => relative(root, file).split(sep).join('/');
const counts = TREES.map((t) => ({ name: t.name, files: results.filter((r) => t.owns(rel(r.filePath))).length }));
const empty = counts.filter((c) => c.files === 0);
if (empty.length) {
    console.error(`✗ check-lint: no file examined under ${empty.map((c) => c.name).join(', ')} — the tree moved or the patterns no longer match it.`);
    process.exit(2);
}

const findings = [];
const unparsed = [];
for (const r of results) {
    for (const m of r.messages) {
        const line = `   ${rel(r.filePath)}:${m.line ?? 0}:${m.column ?? 0}  ${m.message}${m.ruleId ? `  [${m.ruleId}]` : ''}`;
        (m.fatal ? unparsed : findings).push(line);
    }
}

const summary = counts.map((c) => `${c.files} in ${c.name}`).join(', ');

if (unparsed.length) {
    console.error(`✗ check-lint: ${unparsed.length} file(s) could not be parsed, so they were not examined:\n`);
    for (const l of unparsed) console.error(l);
    process.exit(2);
}
if (findings.length) {
    console.error(`✗ check-lint: ${findings.length} finding(s) in ${results.length} files (${summary}):\n`);
    for (const l of findings) console.error(l);
    console.error('\n  Fix the code. An `eslint-disable` comment has no effect here; the rules change only in eslint.config.mjs.');
    process.exit(1);
}
console.log(`✓ check-lint: ${results.length} files examined (${summary}), no finding.`);
