/**
 * corpus — load the generated API corpus, or refuse to start.
 *
 * This is the server's only input. It is a local file, read once at startup, and there is no
 * network client anywhere in the path — an assertion in the tests, not just a claim here.
 *
 * WHY IT REFUSES RATHER THAN DEGRADES. A corpus that fails its own contract would still
 * answer questions, just from garbage — and the caller is an assistant that will relay those
 * answers with total confidence. A server that will not boot is debuggable in one line; a
 * server that lies is a support ticket six weeks later.
 *
 * WHY THE LIBRARY VERSION COMES FROM THE ROOT MANIFEST. There are three package.json files
 * on the library's path and two of them are generated: the build overwrites
 * `packages/angulux/package.json` from the workspace root on every run. Reading the nearer
 * one would work today and report a stale or half-written value later.
 *
 * The import of the corpus contract reaches up into `tools/` — safe because this package is
 * `private: true` and is never packed, which the manifest tests assert. If it ever becomes
 * publishable, that import has to be vendored first.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateCorpus } from '../../../tools/corpus/contract.mjs';

const repoRoot = resolve(import.meta.dirname, '../../..');
const DEFAULT_CORPUS = resolve(repoRoot, 'corpus/corpus.json');

/**
 * @param {string} [corpusPath] override, used by the tests
 * @returns {{
 *   libraryVersion: string, sourceHash: string, closureCount: number, formatVersion: string,
 *   moduleCount: number, modules: Array<object>, moduleByName: (name: string) => object | undefined
 * }}
 */
export function loadCorpus(corpusPath = DEFAULT_CORPUS) {
    if (!existsSync(corpusPath)) {
        throw new Error(
            `angulux-mcp: no corpus at ${corpusPath}. It is generated — run \`node tools/corpus/generate.mjs\`.`
        );
    }

    let corpus;
    try {
        corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
    } catch (error) {
        throw new Error(`angulux-mcp: ${corpusPath} is not valid JSON — ${error.message}`);
    }

    const problems = validateCorpus(corpus);
    if (problems.length) {
        throw new Error(
            `angulux-mcp: the corpus at ${corpusPath} does not satisfy its contract:\n  - ${problems.join('\n  - ')}`
        );
    }

    const { version: libraryVersion } = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
    const byName = new Map(corpus.modules.map((module) => [module.name, module]));

    return {
        libraryVersion,
        sourceHash: corpus.generator.sourceHash,
        closureCount: corpus.generator.closureCount,
        formatVersion: corpus.generator.version,
        moduleCount: corpus.modules.length,
        modules: corpus.modules,
        // Exact match on purpose. A fuzzy lookup that quietly resolved `Button` or `buttons`
        // would turn a caller's typo into a confident wrong answer.
        moduleByName: (name) => byName.get(name)
    };
}
