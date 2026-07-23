#!/usr/bin/env node
/**
 * change-detection — declares a change detection strategy explicitly on EVERY @Component.
 *
 * WHY: Angular 22 flipped the default from `Eager` (CheckAlways) to `OnPush`. Verified
 * against the primary source — `@angular/core@22.0.8`, `types/_debug_node-chunk.d.ts`:
 *     OnPush = 0,   // "NOTE: OnPush is enabled by default."   <- THIS note only exists in v22
 *     Eager  = 1,
 *     Default = 1   // @deprecated Use `Eager` instead. "due to be removed"
 *
 * So any component that does NOT declare a strategy changes behaviour SILENTLY: the build
 * is green, the unit tests are green, and the UI freezes. Nothing in the build chain
 * catches this class of defect — only a real browser does.
 *
 * TWO GROUPS, TWO DIFFERENT STRATEGIES:
 *
 *   • 24 decorator NGOÀI icons/ (treetable 5, table 3, api 2, menu, tieredmenu, select,
 *     multiselect, motion) -> `Eager`. They were CheckAlways on Angular 21 and take
 *     mutable inputs. `Eager` PRESERVES the old behaviour; it is not an improvement.
 *
 *   • the 54 decorators INSIDE icons/ -> `OnPush`. They are static SVGs that only take
 *     @Input; OnPush is both correct and cheaper. Declared explicitly rather than relying
 *     on the new default, so the next time Angular changes a default nothing here moves.
 *
 * Result: zero components rely on the framework default.
 *
 * `Eager` exists in BOTH Angular 21 and 22, so this can run while still on 21 — which
 * keeps the framework upgrade isolated as a single variable.
 *
 * Usage: node tools/codemod/change-detection.mjs [--dry]
 */

import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const SRC = 'packages/angulux/src';

/** Returns [start, end) of the bracket pair opening at `open`. */
function matchParen(t, open) {
    let d = 0;
    for (let i = open; i < t.length; i++) {
        if (t[i] === '(') d++;
        else if (t[i] === ')') {
            d--;
            if (d === 0) return [open, i + 1];
        }
    }
    return null;
}

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(p);
    }
    return out;
}

const files = walk(SRC);
let touchedFiles = 0;
let added = { Eager: 0, OnPush: 0 };
let importsAdded = 0;
const byModule = {};

for (const f of files) {
    const isIcon = path.relative(SRC, f).split(path.sep)[0] === 'icons';
    const strategy = isIcon ? 'OnPush' : 'Eager';
    let t = fs.readFileSync(f, 'utf8');
    let changed = false;

    // Walk backwards so insertions do not shift the offsets still to be processed.
    const spots = [];
    for (const m of t.matchAll(/@Component\s*\(/g)) {
        const open = t.indexOf('(', m.index);
        const range = matchParen(t, open);
        if (range) spots.push(range);
    }
    for (const [s, e] of spots.reverse()) {
        const body = t.slice(s, e);
        if (/\bchangeDetection\s*:/.test(body)) continue;

        // Insert right after the first '({', matching the indentation of the next property.
        const braceRel = body.indexOf('{');
        if (braceRel < 0) continue;
        const abs = s + braceRel + 1;
        const after = t.slice(abs);
        const indentMatch = after.match(/^\r?\n([ \t]+)/);
        const nl = indentMatch ? indentMatch[0] : '\n    ';
        const indent = indentMatch ? indentMatch[1] : '    ';
        t = t.slice(0, abs) + `${nl.replace(/[ \t]+$/, '')}${indent}changeDetection: ChangeDetectionStrategy.${strategy},` + t.slice(abs);
        changed = true;
        added[strategy]++;
        const mod = path.relative(SRC, f).split(path.sep)[0];
        byModule[mod] = (byModule[mod] || 0) + 1;
    }

    if (changed && !/\bChangeDetectionStrategy\b/.test(t.replace(/ChangeDetectionStrategy\.\w+/g, ''))) {
        // Not imported yet -> extend the existing @angular/core import, or add one.
        const imp = t.match(/import\s*\{([^}]*)\}\s*from\s*'@angular\/core';/);
        if (imp) {
            const names = imp[1];
            t = t.replace(imp[0], `import { ChangeDetectionStrategy,${names}} from '@angular/core';`);
        } else {
            t = `import { ChangeDetectionStrategy } from '@angular/core';\n` + t;
        }
        importsAdded++;
    }

    if (changed) {
        touchedFiles++;
        if (!DRY) fs.writeFileSync(f, t);
    }
}

console.log(`  file duoc sua      : ${touchedFiles}`);
console.log(`  them Eager  (ngoai icons/): ${added.Eager}`);
console.log(`  them OnPush (trong icons/): ${added.OnPush}`);
console.log(`  dong import bo sung: ${importsAdded}`);
console.log(`  theo module (ngoai icons/):`);
for (const [m, n] of Object.entries(byModule).sort((a, b) => b[1] - a[1])) {
    if (m !== 'icons') console.log(`      ${m.padEnd(16)} ${n}`);
}
if (DRY) console.log('  (--dry: khong ghi gi)');
