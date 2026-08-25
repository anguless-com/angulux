/**
 * Colours the guide snippets, the same way and at the same time as the demos.
 *
 * Separate from `build-demos.mjs` because the two have opposite guarantees and should not look
 * alike in the build log: a demo is CUT OUT of a component that ran, so it cannot drift; a
 * guide snippet is written by hand, so it can. Keeping the pipelines apart is a reminder of
 * which one carries a promise.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTokenizer } from './highlight.mjs';
import { SNIPPETS } from './guide-snippets.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../public');

const tokenizer = await createTokenizer();
const { tokenize, palette } = tokenizer.scope();

const snippets = {};

for (const [id, { lang, code }] of Object.entries(SNIPPETS)) {
    snippets[id] = tokenize(code, lang);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'guide.json'), JSON.stringify({ palette, snippets }));

console.log(`guide: ${Object.keys(snippets).length} snippet(s), ${palette.length} colour(s)`);
