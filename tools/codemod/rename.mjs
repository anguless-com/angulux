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
import { execSync } from 'node:child_process';

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
    // Duong dan co the NHIEU DOAN: primeng/types/button, primeng/icons/baseicon,
    // primeng/ts-helpers. The first version matched only one segment and missed 388 imports.
    t = t.replace(/(['"])primeng((?:\/[a-zA-Z0-9._-]+)*)\1/g, (_, q, rest) => `${q}angulux${rest}${q}`);

    // --- 2. khai bao selector trong decorator ---
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

    // --- 3. the phan tu trong template ---
    for (const e of ELEMS) {
        t = t.replaceAll(`<${e}`, `<${aglElem(e)}`);
        t = t.replaceAll(`</${e}>`, `</${aglElem(e)}>`);
    }

    // --- 4. thuoc tinh directive trong template ---
    // Chi thay khi dung nhu THUOC TINH: dung sau khoang trang / dau [ / dau (,
    // va theo sau la '=', ']', ')', khoang trang, '/' hoac '>'.
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
        let orig;
        try {
            orig = execSync(`git show HEAD:${f}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        } catch {
            continue; // file moi, khong co ban goc de so
        }
        checked++;
        if (untransform(now) !== orig) {
            mismatch++;
            if (mismatch <= 5) console.error(`  ✗ ${f} — reversing does NOT reproduce the original`);
        }
    }
    console.log(`\n  compared ${checked} file(s), ${mismatch} mismatched`);
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
console.log(`  file quet   : ${files.length}`);
console.log(`  file doi    : ${changed}`);
console.log(`  file giu nguyen: ${untouched}`);
if (DRY) console.log('  (--dry: khong ghi gi)');
