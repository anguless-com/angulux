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
 * opens `/button` should not download the API of every other module to see it.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTokenizer } from './highlight.mjs';

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

/**
 * The line a reader has to write before anything else on the page is usable.
 *
 * A module with no NgModule is not a defect and must not be papered over: `icons` exports
 * standalone components under their own entry points, so the honest line names the module
 * path and says the exports come one at a time.
 *
 * Composed here rather than in the page because it is coloured here — and colouring happens
 * at build time so that a prerendered page arrives already correct (`highlight.mjs` explains
 * at length). A string built in the browser could not be tokenised without shipping a
 * highlighter to the browser.
 */
const importLine = (module) =>
    module.ngModules.length
        ? `import { ${module.ngModules.join(', ')} } from '${module.entrypoint}';`
        : `// ${module.name} exports standalone symbols — import them by name from '${module.entrypoint}/<name>'`;

const tokenizer = await createTokenizer();

for (const module of corpus.modules) {
    const { tokenize, palette } = tokenizer.scope();

    writeFileSync(resolve(OUT, `${module.name}.json`), JSON.stringify({ ...module, importLine: tokenize(importLine(module), 'source'), palette }));
}

/**
 * Which version of the library this site describes.
 *
 * NOT the root `package.json` version. That field says `22.0.0-rc.0`, a version that never
 * existed on npm — `release/angulux.releaserc.json` explains why at length: semantic-release
 * derives the version from tags and stamps `dist` during the run, so the committed number is
 * whatever was last written by hand. Printing it would tell every reader the wrong thing.
 *
 * The tag is the record. `unreleased` counts commits since it that touch the published
 * package, because a site built from `main` documents work nobody can install yet, and
 * saying "22.2.0" flat would be false in a different way.
 *
 * If tags are unavailable — a shallow clone with none fetched — this writes null rather than
 * guessing, and the page says nothing rather than something untrue.
 */
function libraryVersion() {
    try {
        const tag = execFileSync('git', ['describe', '--tags', '--match', 'angulux-v*', '--abbrev=0'], { cwd: resolve(HERE, '../../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        const since = execFileSync('git', ['rev-list', `${tag}..HEAD`, '--', 'packages/angulux/'], { cwd: resolve(HERE, '../../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

        return { released: tag.replace(/^angulux-v/, ''), unreleased: since.split('\n').filter(Boolean).length };
    } catch {
        return { released: null, unreleased: 0 };
    }
}

const version = libraryVersion();

writeFileSync(resolve(OUT, '..', 'version.json'), JSON.stringify(version));

console.log(`api: ${corpus.modules.length} modules from corpus generator v${corpus.generator.version}`);
console.log(`version: ${version.released ?? 'unknown'}${version.unreleased ? ` +${version.unreleased} unreleased` : ''}`);
