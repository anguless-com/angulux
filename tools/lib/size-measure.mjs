// What one entry point of the library costs an application that imports it.
//
// The number is taken the way an Angular application build would take it, because the
// published files are not what a browser receives. A `fesm2022` file is PARTIALLY compiled:
// templates are still strings inside `ɵɵngDeclareComponent(...)`, and every class carries
// static initialisers a bundler must assume have side effects. Measuring those files as they
// sit — or minifying them with a plain bundler — reports a library that cannot be tree-shaken
// at all, which is not the library a consumer ships.
//
// So each file goes through the same transformer `@angular/build` runs over `node_modules`
// (the Angular linker, then the passes that mark top-level calls pure and wrap static
// members), and the result is bundled and minified by esbuild with the application builder's
// production defines. `@angular/*`, `rxjs`, `chart.js` and the theme presets stay external:
// the application pays for those once, whichever components it uses.
//
// The entry is `export * from '<entry point>'`, so nothing the entry point itself exports is
// shaken out. That is the cost of using everything a module offers; a consumer who imports
// one directive from a module that exports three can pay less.

import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

/** Packages the consumer installs once, whatever they import from the library. */
export const EXTERNAL = ['@angular/*', 'rxjs', 'rxjs/*', 'chart.js', 'chart.js/*', '@primeuix/*'];

/** The production defines of `@angular/build:application`. */
export const DEFINE = { ngDevMode: 'false', ngJitMode: 'false', ngServerMode: 'false', ngHmrMode: 'false', ngI18nClosureMode: 'false' };

/**
 * The entry points worth a row: every export that resolves to JavaScript.
 * `./package.json` is not code.
 */
export function entryPoints(manifest) {
    const out = [];
    for (const [key, value] of Object.entries(manifest.exports ?? {})) {
        const file = typeof value === 'string' ? value : value?.default;
        if (typeof file !== 'string' || !/\.m?js$/.test(file)) continue;
        out.push({ key, name: key === '.' ? '(root)' : key.slice(2), file });
    }
    return out;
}

/** `components`, `icons` or `types` — three families with three very different costs. */
export function family(name) {
    if (name.startsWith('icons/') || name === 'icons') return 'icons';
    if (name.startsWith('types/')) return 'types';
    return 'components';
}

/**
 * Which package an input file belongs to, read off its path. `own` is the entry point's own
 * file; `library` is every other entry point it drags in.
 */
export function owner(inputPath, ownFile) {
    const p = inputPath.replaceAll('\\', '/');
    if (ownFile && p.endsWith(ownFile.replace(/^\.\//, ''))) return 'own';
    const forked = p.match(/packages\/angulux-(utils|styled|styles|motion)\//);
    if (forked) return forked[1];
    if (/packages\/angulux\/dist\//.test(p)) return 'library';
    return 'other';
}

/** Sum a metafile output's inputs by owner. */
export function attribute(inputs, ownFile) {
    const parts = {};
    for (const [path, { bytesInOutput }] of Object.entries(inputs)) {
        if (!bytesInOutput) continue;
        const key = owner(path, ownFile);
        parts[key] = (parts[key] ?? 0) + bytesInOutput;
    }
    return parts;
}

export function compressed(bytes) {
    return {
        min: bytes.length,
        gzip: gzipSync(bytes, { level: 9 }).length,
        brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length
    };
}

/**
 * Inputs every measured bundle contains: the floor an application pays for its first
 * component, and never again.
 */
export function sharedInputs(bundles) {
    if (bundles.length === 0) return {};
    const [first, ...rest] = bundles;
    const shared = {};
    for (const [path, bytes] of Object.entries(first)) {
        if (rest.every((b) => path in b)) shared[path] = Math.min(bytes, ...rest.map((b) => b[path]));
    }
    return shared;
}

/**
 * Which files weigh the most across the library, and how many entry points pull each in.
 * A large file behind many entry points is where one fix pays off many times.
 */
export function heaviestInputs(bundles, limit = 25) {
    const acc = new Map();
    for (const inputs of bundles) {
        for (const [path, bytes] of Object.entries(inputs)) {
            const row = acc.get(path) ?? { path, bytes: 0, usedBy: 0 };
            row.bytes = Math.max(row.bytes, bytes);
            row.usedBy += 1;
            acc.set(path, row);
        }
    }
    return [...acc.values()].sort((a, b) => b.bytes - a.bytes).slice(0, limit);
}

export const kb = (n) => (n / 1024).toFixed(1).padStart(7);

// ── The baseline ────────────────────────────────────────────────────────────────────────
//
// `tools/size-baseline.json` records the minified bytes of every entry point. Minified, not
// gzip: the minified size is a property of the build alone, while a gzip size also depends on
// the zlib inside whichever Node ran the measurement.
//
// An entry point may drift by ALLOWANCE without anyone touching the file — a bug fix that
// adds a guard clause should not need a baseline edit. Past that, growth fails. So does a
// shrink past it, until the baseline is pruned down: an optimisation that is not written
// into the baseline is room the next change can silently take back.

/** How far an entry point may sit from its baseline: 1 %, and never less than 512 bytes. */
export const allowance = (bytes) => Math.max(512, Math.ceil(bytes * 0.01));

/** Compare measured minified sizes with the baseline. Both are `{ name: bytes }`. */
export function judge(baseline, found) {
    const grew = [];
    const shrank = [];
    const added = [];
    const removed = [];
    for (const [name, bytes] of Object.entries(found)) {
        if (!(name in baseline)) {
            added.push({ name, found: bytes });
            continue;
        }
        const base = baseline[name];
        const slack = allowance(base);
        if (bytes > base + slack) grew.push({ name, baseline: base, found: bytes, slack });
        else if (bytes < base - slack) shrank.push({ name, baseline: base, found: bytes, slack });
    }
    for (const name of Object.keys(baseline)) if (!(name in found)) removed.push({ name, baseline: baseline[name] });
    return { grew, shrank, added, removed };
}

/**
 * The baseline after a prune: every number that fell is lowered, an entry point that is new
 * gets its first number, one that no longer exists is dropped. Nothing is ever raised —
 * raising a number is a decision, and it is made by editing the file by hand, in review.
 */
export function pruneBaseline(baseline, found) {
    const next = {};
    for (const name of Object.keys(found).sort()) next[name] = name in baseline ? Math.min(baseline[name], found[name]) : found[name];
    return next;
}
