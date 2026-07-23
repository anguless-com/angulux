#!/usr/bin/env node
/**
 * check-public-tree — refuses to let internal-only paths stay in the git index.
 *
 * WHY THIS EXISTS, precisely: `.gitignore` does not untrack anything. Adding `.agl/` to it
 * and then `git mv`-ing an internal strategy document into `.agl/archive/` left that
 * document **tracked**, and `git status` said nothing, because ignore rules only apply to
 * files git is not already following. The document was one `git push` away from being
 * public, and every check in the repo was green.
 *
 * "Remember that gitignore does not untrack" is not a control. This is.
 *
 * Usage: node tools/check-public-tree.mjs
 */

import { execFileSync } from 'node:child_process';

/** Paths that must never appear in the index, with the reason stated for the reader. */
const FORBIDDEN = [
    [/^\.agl\//, 'maintainer working notes — deadlines, owner decisions, internal application names'],
    [/^plans\//, 'internal planning documents, and E2E evidence screenshots'],
    [/^docs\/specs\//, 'internal specifications — they read as a procedure, not as documentation'],
    [/^ref\//, 'upstream reference checkouts — reproducible, and 137MB'],
    [/^provenance\/tarballs\//, 'upstream tarballs; one carries proprietary license text'],
    [/(^|\/)node_modules\//, 'dependencies'],
    [/(^|\/)dist\//, 'build output']
];

const tracked = execFileSync('git', ['ls-files'], { maxBuffer: 64 * 1024 * 1024 }).toString().split('\n').filter(Boolean);

const violations = [];
for (const file of tracked) {
    for (const [pattern, reason] of FORBIDDEN) {
        if (pattern.test(file)) {
            violations.push({ file, reason });
            break;
        }
    }
}

if (!violations.length) {
    console.log(`✓ check-public-tree: ${tracked.length} tracked files, no internal-only path in the index.`);
    process.exit(0);
}

const byReason = {};
for (const v of violations) (byReason[v.reason] ??= []).push(v.file);

console.error('\n✗ INTERNAL-ONLY PATHS ARE TRACKED BY GIT\n');
for (const [reason, files] of Object.entries(byReason)) {
    console.error(`  ${reason}`);
    for (const f of files.slice(0, 6)) console.error(`      ${f}`);
    if (files.length > 6) console.error(`      … and ${files.length - 6} more`);
    console.error('');
}
console.error('  These are in the index, so .gitignore will not stop them being pushed.');
console.error('  Fix:  git rm -r --cached <path>     (keeps the files on disk)\n');
process.exit(1);
