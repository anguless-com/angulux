#!/usr/bin/env node
/**
 * rename — renames primeng -> angulux and p-* -> agl-*.
 *
 * THE TRAP IN THIS STEP: the source contains roughly 1,700 `'p-xxx'` strings that are CSS
 * CLASS NAMES, and they are textually IDENTICAL to selectors. `'p-datepicker'` is both a
 * component selector and a CSS class. But the CSS classes come from the styling package,
 * and renaming a CSS class breaks every theme.
 *
 * So this codemod does NOT run a `p-` -> `agl-` pattern. It runs an **allowlist** built
 * from the selectors actually declared in `selector:` in the source, and substitutes only
 * in THREE well-defined positions:
 *   1. the `selector: '...'` declaration inside a decorator
 *   2. element tags in templates: `<p-x`, `</p-x>`
 *   3. directive attributes in templates: ` pXxx=`, ` pXxx `, ` pXxx>`, ` pXxx]`
 * Every other string — including `'p-datepicker'` used as a class — is left alone.
 *
 * The substitution is a BIJECTION (verified: `agl-` appeared zero times beforehand), so it
 * can be reversed to prove the diff contains nothing but the rename. See `--verify`.
 *
 * Usage:
 *   node tools/codemod/rename.mjs            # apply
 *   node tools/codemod/rename.mjs --dry      # count only, no writes
 *   node tools/codemod/rename.mjs --verify   # reverse it and diff against git HEAD
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DRY = process.argv.includes('--dry');
const VERIFY = process.argv.includes('--verify');
const root = process.cwd();
const TARGETS = ['packages/angulux/src', 'apps/showcase'];
const EXT = new Set(['.ts', '.html']);

const sel = JSON.parse(fs.readFileSync(path.join(root, 'tools/codemod/selectors.json'), 'utf8'));
// Longest first, so `p-tab` cannot swallow `p-table`.
const ELEMS = [...sel.elementSelectors].sort((a, b) => b.length - a.length);
const ATTRS = [...sel.attributeSelectors].sort((a, b) => b.length - a.length);

const aglElem = (s) => 'agl-' + s.slice(2);
const aglAttr = (s) => 'agl' + s.slice(1);


/**
 * The committed original of a file, or null when git has none (a new file).
 *
 * Three things here are load-bearing, and all three were wrong before 2026-08-29:
 *
 * 1. execFileSync, not execSync. Git permits `;` and `$(…)` in a filename, and a shell
 *    command built by interpolation would execute them. Every other tool in this
 *    repository already passes an argument vector; these two were the exceptions.
 * 2. FORWARD SLASHES. `path.join` yields backslashes on Windows and git rejects
 *    `HEAD:tools\\foo.ts` with exit 128 — which the caller swallows as "new file".
 *    Every file fell into that branch, so on Windows the verification below compared
 *    NOTHING while reporting that everything reversed cleanly.
 * 3. The caller must treat null as "skip" and still refuse to claim success when it
 *    skipped everything. See the guard after the loop.
 */
function committedOriginal(file) {
    try {
        return execFileSync('git', ['show', `HEAD:${file.split(path.sep).join('/')}`], {
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'ignore']
        });
    } catch {
        return null;
    }
}

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (['node_modules', 'dist', '.angular', 'attic'].includes(e.name)) continue;
            walk(p, out);
        } else if (EXT.has(path.extname(e.name))) out.push(p);
    }
    return out;
}

function transform(text) {
    let t = text;

    // --- 1. import path + package name ---
    // An import path can have MANY SEGMENTS: primeng/types/button, primeng/icons/baseicon,
    // primeng/ts-helpers. The first version matched only one segment and missed 388 imports.
    t = t.replace(/(['"])primeng((?:\/[a-zA-Z0-9._-]+)*)\1/g, (_, q, rest) => `${q}angulux${rest}${q}`);

    // --- 2. selector declaration inside the decorator ---
    t = t.replace(/(selector:\s*)('([^']*)')/g, (full, head, _q, inner) => {
        const parts = inner.split(',').map((raw) => {
            const s = raw.trim();
            if (ELEMS.includes(s)) return raw.replace(s, aglElem(s));
            const m = s.match(/^\[(p[A-Z][a-zA-Z0-9]*)\]$/);
            if (m && ATTRS.includes(m[1])) return raw.replace(m[1], aglAttr(m[1]));
            return raw;
        });
        return head + "'" + parts.join(',') + "'";
    });

    // --- 3. element tags in templates ---
    for (const e of ELEMS) {
        t = t.replaceAll(`<${e}`, `<${aglElem(e)}`);
        t = t.replaceAll(`</${e}>`, `</${aglElem(e)}>`);
    }

    // --- 4. directive attributes in templates ---
    // Replace only in ATTRIBUTE position: preceded by whitespace, '[' or '(',
    // and followed by '=', ']', ')', whitespace, '/' or '>'.
    for (const a of ATTRS) {
        const re = new RegExp(`(?<=[\\s\\[(])${a}(?=[=\\]) \\t\\n/>])`, 'g');
        t = t.replace(re, aglAttr(a));
    }

    return t;
}

/** Exact inverse of the substitutions above — used to prove the diff is a pure rename. */
function untransform(text) {
    let t = text;
    t = t.replace(/(['"])angulux((?:\/[a-zA-Z0-9._-]+)*)\1/g, (_, q, rest) => `${q}primeng${rest}${q}`);
    for (const e of ELEMS) {
        t = t.replaceAll(`<${aglElem(e)}`, `<${e}`);
        t = t.replaceAll(`</${aglElem(e)}>`, `</${e}>`);
    }
    t = t.replace(/(selector:\s*)('([^']*)')/g, (full, head, _q, inner) => {
        const parts = inner.split(',').map((raw) => {
            const s = raw.trim();
            const back = ELEMS.find((e) => aglElem(e) === s);
            if (back) return raw.replace(s, back);
            const m = s.match(/^\[(agl[A-Z][a-zA-Z0-9]*)\]$/);
            const ba = m && ATTRS.find((a) => aglAttr(a) === m[1]);
            if (ba) return raw.replace(m[1], ba);
            return raw;
        });
        return head + "'" + parts.join(',') + "'";
    });
    for (const a of ATTRS) {
        const A = aglAttr(a);
        const re = new RegExp(`(?<=[\\s\\[(])${A}(?=[=\\]) \\t\\n/>])`, 'g');
        t = t.replace(re, a);
    }
    return t;
}

const files = TARGETS.flatMap((d) => (fs.existsSync(d) ? walk(d) : []));

if (VERIFY) {
    let mismatch = 0;
    let checked = 0;
    for (const f of files) {
        const now = fs.readFileSync(f, 'utf8');
        const orig = committedOriginal(f);
        if (orig === null) continue; // new file — there is no original to compare against
        checked++;
        if (untransform(now) !== orig) {
            mismatch++;
            if (mismatch <= 5) console.error(`  ✗ ${f} — reversing does NOT reproduce the original`);
        }
    }
    console.log(`\n  compared ${checked} file(s), ${mismatch} mismatched`);

    // Comparing nothing is not a pass. If every candidate fell into the "new file"
    // branch, the check did not run — say so instead of printing the success line.
    if (files.length && !checked) {
        console.error('\n✗ compared 0 of ' + files.length + ' file(s) — this verified NOTHING.');
        console.error('  Every candidate looked like a new file, which means `git show` failed for');
        console.error('  all of them. Check that you are inside the work tree and that HEAD exists.');
        process.exit(1);
    }

    if (mismatch) {
        console.error('\n✗ The diff is NOT a pure rename — something else got mixed in.');
        process.exit(1);
    }
    console.log('✓ Every file reverses to its exact original => the diff is a PURE rename, nothing else.');
    process.exit(0);
}

let changed = 0;
let untouched = 0;
for (const f of files) {
    const before = fs.readFileSync(f, 'utf8');
    const after = transform(before);
    if (before !== after) {
        changed++;
        if (!DRY) fs.writeFileSync(f, after);
    } else untouched++;
}
console.log(`  files scanned  : ${files.length}`);
console.log(`  files changed  : ${changed}`);
console.log(`  files untouched: ${untouched}`);
if (DRY) console.log('  (--dry: nothing written)');
