#!/usr/bin/env node
/**
 * find-half-renames — finds places where a rename codemod only did HALF the job.
 *
 * THE ORIGINAL BUG: the rename codemod turned attribute selectors `pXxx` -> `aglXxx` with
 * a regex using the lookbehind `(?<=[\s\[(])`. That lookbehind matches `pBind` when it
 * follows whitespace (the DECLARATION `pBind = input(...)`) but NOT when it follows a dot
 * (the REFERENCE `this.pBind()`). Result: the declaration carried one name and every
 * reference carried another.
 *
 * Why renaming the declaration was RIGHT: for an attribute directive the input name must
 * match the selector. An `input()` with no alias takes the property name, so the selector
 * `[aglBind]` requires a property called `aglBind`. The mistake was not the rename — it
 * was the incompleteness.
 *
 * Why the codemod's own "reverse it and compare to the original" check did NOT catch this:
 * that check proves nothing foreign entered the diff, but a half-applied rename reverses
 * perfectly. Reversibility is not consistency.
 *
 * Usage: node tools/codemod/find-half-renames.mjs [--fix]
 */

import fs from 'node:fs';
import path from 'node:path';

const FIX = process.argv.includes('--fix');
const SRC = 'packages/angulux/src';
const sel = JSON.parse(fs.readFileSync('tools/codemod/selectors.json', 'utf8'));
const ATTRS = sel.attributeSelectors; // pXxx
const aglOf = (a) => 'agl' + a.slice(1);

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name.endsWith('.ts')) out.push(p);
    }
    return out;
}

const files = walk(SRC);
const findings = [];
let fixedRefs = 0;
let fixedFiles = 0;

for (const f of files) {
    let t = fs.readFileSync(f, 'utf8');
    const orig = t;
    for (const a of ATTRS) {
        const A = aglOf(a);
        // Only consider files ALREADY renamed for this selector. In such a file, every
        // remaining `pXxx` is fallout from the half-applied rename — there is no legitimate
        // reason for a file using `[aglTooltip]` to still mention `pTooltip`.
        if (!t.includes(A)) continue;
        const leftover = [...t.matchAll(new RegExp(`\\b${a}\\b`, 'g'))];
        if (leftover.length) {
            findings.push({ file: path.relative(SRC, f), attr: a, agl: A, count: leftover.length });
            if (FIX) {
                t = t.replace(new RegExp(`\\b${a}\\b`, 'g'), A);
                fixedRefs += leftover.length;
            }
        }
    }
    if (FIX && t !== orig) {
        fs.writeFileSync(f, t);
        fixedFiles++;
    }
}

if (!findings.length) {
    console.log('✓ No half-applied renames left.');
    process.exit(0);
}

console.log(`  Tim thay ${findings.length} cho doi NUA VOI, tren ${new Set(findings.map((x) => x.file)).size} file:\n`);
const byAttr = {};
for (const f of findings) byAttr[f.attr] = (byAttr[f.attr] || 0) + f.count;
for (const [a, n] of Object.entries(byAttr).sort((x, y) => y[1] - x[1])) {
    console.log(`    ${a.padEnd(24)} -> ${aglOf(a).padEnd(26)} ${n} tham chieu con sot`);
}
console.log('');
for (const f of findings.slice(0, 15)) console.log(`    ${f.file}:  .${f.attr} x${f.count}`);
if (findings.length > 15) console.log(`    ... va ${findings.length - 15} cho nua`);

if (FIX) {
    console.log(`\n✓ Da sua ${fixedRefs} tham chieu tren ${fixedFiles} file.`);
} else {
    console.log('\n  (re-run with --fix to repair)');
    process.exit(1);
}
