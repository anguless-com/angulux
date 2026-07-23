#!/usr/bin/env node
/**
 * spec-change-detection — declares `Eager` on the test hosts inside .spec.ts files.
 *
 * WHY: `change-detection.mjs` only covers library code (126 @Component, all now explicit).
 * The inherited spec suite contains 503 more @Component declarations — the **test hosts**
 * that wrap the component under test, e.g.:
 *
 *     @Component({ standalone: false, template: `<agl-progressbar [value]="value">` })
 *     class TestProgressBarComponent { value = 50; }
 *
 * None of them declares changeDetection. On Angular 21 they were CheckAlways; on Angular
 * 22 they silently became OnPush. The suite also runs ZONELESS
 * (`provideZonelessChangeDetection`), so an OnPush host that is never marked dirty NEVER
 * re-renders — `component.value = 75` followed by `await fixture.whenStable()` still
 * reads back 50.
 *
 * This is a failure of the SCAFFOLDING, not of the library: these hosts are measuring
 * instruments whose only job is to pass an @Input down. Restoring `Eager` restores the
 * semantics the upstream author actually wrote, so the measurement points at the LIBRARY
 * instead of at the instrument. The 126 library components keep their explicit strategies
 * and are NOT touched — so what is being measured is still the library's real Angular 22
 * behaviour.
 *
 * Usage:
 *   node tools/codemod/spec-change-detection.mjs [--dry] [--only <path-substring>]
 */

import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
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
        else if (e.name.endsWith('.spec.ts')) out.push(p);
    }
    return out;
}

const files = walk(SRC).filter((f) => !ONLY || f.includes(ONLY));
let touchedFiles = 0;
let added = 0;
let importsAdded = 0;

for (const f of files) {
    let t = fs.readFileSync(f, 'utf8');
    let changed = false;

    const spots = [];
    for (const m of t.matchAll(/@Component\s*\(/g)) {
        const open = t.indexOf('(', m.index);
        const range = matchParen(t, open);
        if (range) spots.push(range);
    }
    // Walk backwards so insertions do not shift the offsets still to be processed.
    for (const [s, e] of spots.reverse()) {
        const body = t.slice(s, e);
        if (/\bchangeDetection\s*:/.test(body)) continue;
        const braceRel = body.indexOf('{');
        if (braceRel < 0) continue;
        const abs = s + braceRel + 1;
        const after = t.slice(abs);
        const indentMatch = after.match(/^\r?\n([ \t]+)/);
        const nl = indentMatch ? indentMatch[0] : '\n    ';
        const indent = indentMatch ? indentMatch[1] : '    ';
        t = t.slice(0, abs) + `${nl.replace(/[ \t]+$/, '')}${indent}changeDetection: ChangeDetectionStrategy.Eager,` + t.slice(abs);
        changed = true;
        added++;
    }

    if (changed && !/\bChangeDetectionStrategy\b/.test(t.replace(/ChangeDetectionStrategy\.\w+/g, ''))) {
        const imp = t.match(/import\s*\{([^}]*)\}\s*from\s*'@angular\/core';/);
        if (imp) t = t.replace(imp[0], `import { ChangeDetectionStrategy,${imp[1]}} from '@angular/core';`);
        else t = `import { ChangeDetectionStrategy } from '@angular/core';\n` + t;
        importsAdded++;
    }

    if (changed) {
        touchedFiles++;
        if (!DRY) fs.writeFileSync(f, t);
    }
}

console.log(`  file spec duoc sua : ${touchedFiles} / ${files.length}`);
console.log(`  them Eager         : ${added}`);
console.log(`  dong import bo sung: ${importsAdded}`);
if (DRY) console.log('  (--dry: khong ghi gi)');
