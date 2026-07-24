#!/usr/bin/env node
/**
 * check-tsup-usage — the guard for the class of bug BL-27 was.
 *
 * WHY THIS EXISTS: the four forked packages MUST build with `NODE_ENV=production`. Their own
 * `build` script sets it (`cross-env NODE_ENV=production tsup`). The bug was a DIFFERENT
 * caller invoking tsup another way — `pnpm exec tsup`, a workflow step running tsup directly,
 * a root script bypassing the package's own `build` — which quietly skipped production mode
 * and shipped a dev build. The type checker cannot see it; the tests cannot see it; the
 * artifact is wrong.
 *
 * So the invariant is positional, like every other rename/coupling guard here: `tsup` may be
 * INVOKED AS A COMMAND only inside a fork's own `build` / `build:dev` script. Everywhere else
 * — other packages' scripts, any workflow `run:` block — an invocation is a violation, and
 * the fix is to go through `pnpm run build`.
 *
 * NOT invocations, and therefore fine: the `"tsup": "^8.5.0"` devDependency line, an
 * `import ... from 'tsup'`, the `tsup.config.ts` filename, and prose mentioning tsup.
 *
 * Usage: node tools/check-tsup-usage.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FORKS = ['utils', 'styled', 'styles', 'motion'].map((n) => `packages/angulux-${n}`);
const ALLOWED_SCRIPTS = new Set(['build', 'build:dev']);

const tracked = execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

/**
 * A `tsup` token used as a shell command — not `from 'tsup'`, not `tsup.config`, not the
 * `"tsup": "^8"` version line, and not prose in a comment.
 *
 * The distinction that matters: an invocation has `tsup` in COMMAND position — at the start
 * of a command, or right after a shell operator (`&&`, `;`, `|`, `(`), or right after a
 * runner (`exec`, `npx`, or a `cross-env VAR=x` prefix). Prose like "so tsup emits nothing"
 * has an ordinary word before it, and must not match — that false positive is what a naive
 * `\stsup\s` produced on release.yml's own explanatory comment.
 */
function isCommandInvocation(line) {
    // A YAML or shell comment is never an invocation.
    if (/^\s*#/.test(line)) return false;
    if (/["']tsup["']\s*:/.test(line)) return false; // devDependency version line
    const stripped = line.replace(/from\s+['"]tsup['"]/g, '').replace(/tsup\.config\.\w+/g, '');
    // tsup at command position: line/quote/operator start, or after exec|npx|cross-env VAR=…
    // Trailing boundary includes shell terminators — `pnpm exec tsup)` ends the token with `)`.
    return /(?:^|["'`]|&&|\|\||[;|(]|\bexec\s|\bnpx\s|=\S+\s)\s*tsup(?:\s|$|--|[)&;|`'"])/.test(stripped);
}

const problems = [];
const allowed = [];

for (const file of tracked) {
    const abs = resolve(repoRoot, file);
    if (abs === resolve(fileURLToPath(import.meta.url))) continue; // this file's own prose

    const isPackageJson = basename(file) === 'package.json';
    const isWorkflow = /^\.github\/workflows\/.*\.ya?ml$/.test(file);
    if (!isPackageJson && !isWorkflow) continue;

    if (isPackageJson) {
        let pkg;
        try {
            pkg = JSON.parse(readFileSync(abs, 'utf8'));
        } catch {
            continue;
        }
        const inFork = FORKS.some((f) => file === `${f}/package.json`);
        for (const [name, body] of Object.entries(pkg.scripts ?? {})) {
            if (!isCommandInvocation(body)) continue;
            if (inFork && ALLOWED_SCRIPTS.has(name)) {
                allowed.push(`${file} → scripts.${name}`);
                if (name === 'build' && !/NODE_ENV=production/.test(body)) {
                    problems.push([file, `scripts.build invokes tsup without NODE_ENV=production: "${body}"`]);
                }
            } else {
                problems.push([file, `scripts.${name} invokes tsup outside a fork's build script: "${body}"`]);
            }
        }
    } else {
        readFileSync(abs, 'utf8')
            .split('\n')
            .forEach((line, i) => {
                if (isCommandInvocation(line)) {
                    problems.push([file, `line ${i + 1} invokes tsup in a workflow — build the forks with \`pnpm run build\` instead: "${line.trim()}"`]);
                }
            });
    }
}

// The invariant also requires that all four forks' build scripts ARE present and accounted
// for — a fork whose build stopped calling tsup would silently emit nothing.
for (const f of FORKS) {
    if (!allowed.some((a) => a.startsWith(`${f}/package.json → scripts.build`))) {
        problems.push([`${f}/package.json`, 'no production `build` script invoking tsup — the fork would emit nothing']);
    }
}

if (problems.length) {
    console.error('\n✗ tsup is invoked somewhere it must not be\n');
    let last = null;
    for (const [file, msg] of problems) {
        if (file !== last) {
            console.error(`  ${file}`);
            last = file;
        }
        console.error(`      ${msg}`);
    }
    console.error('\n  The forks must build only through their own `build` script, which sets');
    console.error('  NODE_ENV=production. Any other invocation risks shipping a dev build.\n');
    process.exit(1);
}

console.log(`✓ check-tsup-usage: tsup is invoked only by the 4 forks' own build scripts (${allowed.length} allowed sites).`);
