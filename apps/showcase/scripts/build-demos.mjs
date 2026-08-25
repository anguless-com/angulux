/**
 * Extracts, from every demo component, the two things a reader wants to copy: the markup
 * that rendered, and the file that produced it — then colours both.
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
 *
 * ONE FILE PER MODULE, for the reason `build-api.mjs` gives about the corpus: a reader who
 * opens `/button` should not download the demos of fifty other modules to see it. Colouring
 * is what forced the issue — a single payload carrying every demo would be most of a
 * megabyte — but the waste was already there, and the split fixes both.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHOWCASE_IMPORT_RE, collectDemoFiles, extractCard, readDemo } from './demo-lib.mjs';
import { createTokenizer } from './highlight.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOC_DIR = resolve(HERE, '../src/doc');
const OUT = resolve(HERE, '../public/demos');

const byModule = new Map();
let demoCount = 0;
let plainBytes = 0;

for (const { id, module, path } of collectDemoFiles(DOC_DIR)) {
    const source = readDemo(path);

    // A showcase-only import inside a demo file means the file can no longer be shown
    // verbatim — the reader would copy something that does not exist in their project.
    if (SHOWCASE_IMPORT_RE.test(source)) {
        throw new Error(`${id}: imports a showcase component — demos must contain only the demo`);
    }

    const { template, error } = extractCard(source);

    if (error) {
        throw new Error(`${id}: ${error}`);
    }

    if (!byModule.has(module)) {
        byModule.set(module, []);
    }

    byModule.get(module).push({ id, template, source: source.trimEnd() });
    demoCount++;
    plainBytes += template.length + source.length;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const tokenizer = await createTokenizer();

let written = 0;

for (const [module, entries] of byModule) {
    // A palette per module, over the one shared highlighter, so each file carries only the
    // colours its own code uses.
    const { tokenize, palette } = tokenizer.scope();
    const demos = {};

    for (const { id, template, source } of entries) {
        // Tokens only. The raw text is not shipped beside them — Copy rebuilds it, and
        // `tokenize` refuses to return anything that would not rebuild exactly.
        demos[id] = { module, template: tokenize(template, 'template'), source: tokenize(source, 'source') };
    }

    const json = JSON.stringify({ palette, demos });

    writeFileSync(resolve(OUT, `${module}.json`), json);
    written += json.length;
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

console.log(`demos: ${demoCount} extracted across ${byModule.size} module(s)`);
console.log(`       ${kb(written)} coloured, in ${byModule.size} files (${kb(plainBytes)} of plain source), largest page loads one`);
