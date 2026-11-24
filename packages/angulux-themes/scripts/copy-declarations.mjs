#!/usr/bin/env node
/**
 * Copies the hand-written declaration of every preset entry next to its built module.
 *
 * tsup emits `dist/lux/button/index.mjs` and no declaration for it: the types of a preset
 * entry are written by hand in `src/lux/button/index.d.ts`, because they re-export the token
 * types under `types/` instead of inferring a literal type from the values. The `./*` export
 * in package.json names `dist/<entry>/index.d.ts`, so without this step every subpath import
 * would resolve to a module with no types.
 *
 * A source directory with an `index.ts` and no `index.d.ts` fails the build, and so does a
 * declaration with no built module beside it. Either one is a subpath that would publish
 * half-made.
 */

import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

const problems = [];
let copied = 0;

function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(join(dir, entry.name));
    }

    const rel = relative(src, dir);
    // The package root has its declaration emitted by tsup (dist/index.d.mts).
    if (!rel || !existsSync(join(dir, 'index.ts'))) return;

    const declaration = join(dir, 'index.d.ts');
    const built = join(dist, rel, 'index.mjs');

    if (!existsSync(declaration)) {
        problems.push(`src/${rel}/index.ts has no index.d.ts beside it`);
        return;
    }
    if (!existsSync(built)) {
        problems.push(`dist/${rel}/index.mjs was not built`);
        return;
    }

    copyFileSync(declaration, join(dist, rel, 'index.d.ts'));
    copied++;
}

walk(src);

if (problems.length) {
    console.error(`✗ copy-declarations: ${problems.length} entry point(s) would publish without types:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
}
if (copied === 0) {
    console.error('✗ copy-declarations: found no preset entry to copy. Was src/ moved?');
    process.exit(1);
}

console.log(`✓ copy-declarations: ${copied} declaration file(s) copied to dist/`);
