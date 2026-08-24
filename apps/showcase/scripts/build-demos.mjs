/**
 * Extracts, from every demo component, the two things a reader wants to copy: the markup
 * that rendered, and the file that produced it.
 *
 * It EXTRACTS rather than accepting a hand-written copy, and that is the only interesting
 * decision here. The alternative — a demo file plus a separate snippet describing it — has
 * one failure mode and it is silent: the day someone edits the demo and forgets the snippet,
 * the site starts teaching code that does not do what the page above it just did. Nothing
 * fails, nothing is red, and the site is wrong until a reader reports it. Extraction makes
 * that state unrepresentable.
 *
 * What a demo file must look like is defined once, in `demo-lib.mjs`, and shared with
 * `check:demo-code`. This script stops at the first violation; the gate reports them all.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHOWCASE_IMPORT_RE, collectDemoFiles, extractCard } from './demo-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOC_DIR = resolve(HERE, '../src/doc');
const OUT = resolve(HERE, '../public');

const demos = {};

for (const { id, module, path } of collectDemoFiles(DOC_DIR)) {
    const source = readFileSync(path, 'utf8');

    // A showcase-only import inside a demo file means the file can no longer be shown
    // verbatim — the reader would copy something that does not exist in their project.
    if (SHOWCASE_IMPORT_RE.test(source)) {
        throw new Error(`${id}: imports a showcase component — demos must contain only the demo`);
    }

    const { template, error } = extractCard(source);

    if (error) {
        throw new Error(`${id}: ${error}`);
    }

    demos[id] = { module, template, source: source.trimEnd() };
}

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'demos.json'), JSON.stringify(demos));

console.log(`demos: ${Object.keys(demos).length} extracted`);
