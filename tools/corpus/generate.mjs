#!/usr/bin/env node
/**
 * generate — build `corpus/corpus.json` from this repository's own source, and nothing else.
 *
 * WHY THE ALLOWLIST IS IN HERE RATHER THAN IN A REVIEW CHECKLIST.
 *
 * Constitution P1 forbids loading PrimeTek code from past the MIT line, and the sharper
 * hazard for a documentation corpus is that primeng.dev's PROSE was never MIT at any
 * version — not even at 21.1.9, which only ever covered the source. "We did not copy any of
 * it" is the kind of promise that holds until someone is in a hurry. So the generator is
 * physically unable to read outside `packages/angulux/**` and `tools/**`: every read goes
 * through `readAllowed`, `ref/` is outside the boundary, and there is no network client in
 * this file at all. The licence guarantee is a code path, not a good intention.
 *
 * WHY PROVENANCE IS A CONTENT HASH AND NOT A COMMIT SHA.
 *
 * The plan called for `generator.commit`. A HEAD SHA changes on every commit, so the
 * byte-identical drift gate would fail on all of them — the field would manufacture the
 * drift it exists to detect. `sourceHash` digests exactly the files that fed the corpus, so
 * it changes when and only when the corpus should.
 *
 * WHICH LEAVES ONE THING IT CANNOT SEE, AND THAT IS WHAT `version` IS FOR.
 *
 * `sourceHash` covers the INPUT. Change this generator instead — teach it a new field — and
 * every record gains a key while the digest stays byte-identical, because not one library file
 * moved. That happened when slots were added: the corpus grew 191 records and the hash did not
 * blink. So the format number is bumped whenever a record's SHAPE changes, and a consumer that
 * caches on the hash alone has the one field that tells it the shape moved underneath.
 *
 * Usage:
 *   node tools/corpus/generate.mjs           # write corpus/corpus.json
 *   node tools/corpus/generate.mjs --check   # print what would be written, write nothing
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, relative, sep, join } from 'node:path';

import { extractModule, extractNgModules, sourceFilesOf } from './extract.mjs';

const repoRoot = resolve(import.meta.dirname, '../..');
const SRC = resolve(repoRoot, 'packages/angulux/src');
const CLOSURE = resolve(repoRoot, 'tools/scope/closure.json');
const OUT = resolve(repoRoot, 'corpus/corpus.json');

/**
 * The only directories this generator may read. Anything else is a licence question, not a
 * convenience question — see the header.
 */
const ALLOWED_ROOTS = ['packages/angulux', 'tools'];

export function isAllowed(absolutePath) {
    const rel = relative(repoRoot, resolve(absolutePath));
    if (rel.startsWith('..')) return false;

    const posix = rel.split(sep).join('/');
    return ALLOWED_ROOTS.some((root) => posix === root || posix.startsWith(`${root}/`));
}

export function readAllowed(absolutePath) {
    if (!isAllowed(absolutePath)) {
        throw new Error(
            `corpus generator refused to read ${absolutePath} — outside the allowlist ` +
                `(${ALLOWED_ROOTS.join(', ')}). This boundary is constitution P1, not a preference.`
        );
    }
    return readFileSync(absolutePath, 'utf8');
}

/** Digest of every file that fed the corpus, path included so a rename is a change. */
function sourceHashOf(files) {
    const hash = createHash('sha256');
    for (const file of [...files].sort()) {
        hash.update(relative(repoRoot, file).split(sep).join('/'));
        hash.update('\0');
        // Normalised, so a CRLF checkout and an LF checkout agree.
        hash.update(readAllowed(file).replace(/\r\n/g, '\n'));
        hash.update('\0');
    }
    return hash.digest('hex');
}

export function buildCorpus() {
    const closure = JSON.parse(readAllowed(CLOSURE)).closure;
    // Sorted so the output does not depend on the order the closure happens to be written in.
    const names = [...closure].sort();

    const files = [];
    const modules = names.map((name) => {
        const dir = resolve(SRC, name);
        for (const file of sourceFilesOf(dir)) {
            if (!isAllowed(file)) throw new Error(`refusing to document ${file}`);
            files.push(file);
        }
        return {
            name,
            // `@anguless/angulux/<module>`, not `angulux/<module>`. The package is scoped, and
            // the secondary entry points hang off the scoped name — apps/verify imports
            // `@anguless/angulux/card`. Publishing the unscoped form would have taught every
            // assistant an import that does not resolve, which is the precise failure this
            // corpus exists to prevent.
            //
            // READ FROM DISK, NOT ASSUMED. This used to be an unconditional template, and it
            // was wrong for exactly one module: `types` has no `ng-package.json`, so ng-packagr
            // never emits a bare `@anguless/angulux/types` entry point — only the per-module
            // `types/<name>` ones. The generated page printed that import anyway, and in a real
            // consumer install it throws ERR_PACKAGE_PATH_NOT_EXPORTED. Same failure the
            // paragraph above congratulates itself for avoiding, arrived at from the other side.
            //
            // `ng-package.json` IS the rule: ng-packagr creates a secondary entry point for
            // each directory that has one. Deriving it here means `check:corpus`, which
            // regenerates and compares byte for byte, now also guards this — no new gate needed.
            entrypoint: existsSync(join(dir, 'ng-package.json')) ? `@anguless/angulux/${name}` : null,
            description: '',
            ngModules: extractNgModules(dir),
            declarations: extractModule(dir)
        };
    });

    return {
        // 1 -> 2: declarations gained `slots`. 2 -> 3: aliases and `extends`. 3 -> 4: modules
        // gained `ngModules`, the name a reader imports. See the header for why the hash is blind
        // to all three.
        generator: { version: '4', sourceHash: sourceHashOf(files), closureCount: closure.length },
        modules
    };
}

/** One serialisation, used by both the writer and the drift gate, so they cannot disagree. */
export function serialise(corpus) {
    return `${JSON.stringify(corpus, null, 4)}\n`.replace(/\r\n/g, '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
    const corpus = buildCorpus();
    const text = serialise(corpus);
    const declarations = corpus.modules.reduce((n, m) => n + m.declarations.length, 0);
    const inputs = corpus.modules.reduce((n, m) => n + m.declarations.reduce((k, d) => k + d.inputs.length, 0), 0);

    if (process.argv.includes('--check')) {
        console.log(`corpus would be ${text.length} bytes: ${corpus.modules.length} modules, ${declarations} declarations, ${inputs} inputs`);
    } else {
        mkdirSync(resolve(repoRoot, 'corpus'), { recursive: true });
        writeFileSync(OUT, text);
        console.log(`✓ corpus: ${corpus.modules.length} modules, ${declarations} declarations, ${inputs} inputs → corpus/corpus.json`);
    }
}
