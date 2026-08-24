/**
 * Splits the committed corpus into one JSON file per module, plus an index.
 *
 * The corpus is the single source of truth for the API surface, and `check:corpus` already
 * guarantees it matches the library. So this script derives NOTHING: it slices a file that
 * is already gated. That is the whole point — a showcase that re-read the library source
 * would become a second opinion about the API, and the first time the two disagreed there
 * would be no way to tell which one was lying.
 *
 * One file per module rather than one big file because the corpus is ~780 KB: a reader who
 * opens `/button` should not download the API of 63 other modules to see it.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(HERE, '../../../corpus/corpus.json');
const OUT = resolve(HERE, '../public/api');

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// The index carries just enough for navigation and for the home page to describe a module
// without fetching it. `declarationCount` is what lets the nav show which modules are
// substantial without loading 64 files.
//
// `declares` is the lookup that makes inheritance resolvable in the browser. A declaration
// records the NAME of its base class, and the base classes do not live where a reader would
// guess — `BaseInput` is its own module, not part of `base` — so the page needs a map from
// class name to the file that holds it before it can follow the chain.
const index = corpus.modules.map((module) => ({
    name: module.name,
    entrypoint: module.entrypoint,
    description: module.description ?? '',
    declarationCount: module.declarations.length,
    declares: module.declarations.map((declaration) => declaration.name)
}));

writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(index));

for (const module of corpus.modules) {
    writeFileSync(resolve(OUT, `${module.name}.json`), JSON.stringify(module));
}

console.log(`api: ${corpus.modules.length} modules from corpus generator v${corpus.generator.version}`);
