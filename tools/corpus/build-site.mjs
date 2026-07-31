#!/usr/bin/env node
/**
 * build-site — write the publishable files from the COMMITTED corpus.
 *
 * It reads `corpus/corpus.json` rather than re-deriving from source, deliberately. The
 * committed corpus is the artifact of record and `check:corpus` already guarantees it matches
 * the library, so re-extracting here would add a second path that could disagree with the
 * gated one — and the published site would then be neither the corpus nor the source.
 *
 * A `.nojekyll` file is written alongside. Without it GitHub Pages runs the output through
 * Jekyll, which silently drops paths beginning with an underscore. Nothing here starts with
 * one today, and a module added later that does would vanish from the site with no error
 * anywhere — the same shape of silent loss the rest of this feature keeps guarding against.
 *
 * Usage: node tools/corpus/build-site.mjs [--out <dir>]
 */

import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { renderSite } from './render-llms.mjs';
import { validateCorpus } from './contract.mjs';

const repoRoot = resolve(import.meta.dirname, '../..');
const outArg = process.argv.indexOf('--out');
const OUT = resolve(repoRoot, outArg >= 0 ? process.argv[outArg + 1] : 'site');

const corpus = JSON.parse(readFileSync(resolve(repoRoot, 'corpus/corpus.json'), 'utf8'));

const problems = validateCorpus(corpus);
if (problems.length) {
    console.error('✗ refusing to publish a corpus that does not satisfy its contract:');
    for (const problem of problems) console.error(`    - ${problem}`);
    process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const files = renderSite(corpus);
for (const [name, contents] of files) {
    const target = resolve(OUT, name);
    // `llms/index.html` is nested. Without this the write throws ENOENT on a clean checkout
    // and only for that one entry, which reads as a corrupt corpus rather than a missing dir.
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
}
writeFileSync(resolve(OUT, '.nojekyll'), '');

const pages = [...files.keys()].filter((name) => name.endsWith('.md')).length;
console.log(`✓ build-site: ${files.size} files (${pages} module pages) + .nojekyll → ${OUT}`);
