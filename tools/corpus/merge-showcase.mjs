#!/usr/bin/env node
/**
 * merge-showcase — put the human documentation site at the host root, without moving a single
 * address an assistant may have cached.
 *
 * WHY IT IS A SEPARATE STEP. `build-site.mjs` renders the LLM-facing files from the committed
 * corpus and nothing else; it is small, gated and tested, and it stays that way. This script
 * runs after it and takes over exactly one file — the root `index.html` — which is safe to
 * take because `renderSite` writes that same landing page twice, to `/` and to `/llms/`. The
 * LLM index therefore does not move, it merely stops being the front door.
 *
 * WHAT MUST NOT MOVE. `llms.txt` and `llms-full.txt` live at the HOST ROOT by convention —
 * that is the whole reason this project owns a subdomain rather than a repository path (see
 * pages.yml). Every `<module>.md` keeps its address for the same reason. So every collision
 * other than `index.html` is a hard error here: a silently overwritten `llms.txt` would be a
 * dead URL for every assistant that ever fetched it, and nothing downstream would notice.
 *
 * ROUTING ON GITHUB PAGES. Pages serves static files and has no SPA fallback, so a router
 * URL like `/button` 404s unless something exists at that path. Two mechanisms, deliberately
 * both:
 *
 *   • a directory index per module, so the 64 real pages answer 200 — which is what search
 *     engines and link checkers record;
 *   • `404.html`, which Pages serves for anything else. That catches a module added to the
 *     corpus later, and it degrades to the app's own "not in the corpus" page rather than to
 *     GitHub's.
 *
 * This is not prerendering: the HTML served is the app shell, and the content arrives when
 * the bundle boots. Real prerendering would need a server build and a fetch that works
 * without a browser; it is worth doing, and it is not what makes the URL work.
 *
 * Usage: node tools/corpus/merge-showcase.mjs [--from <dir>] [--out <dir>]
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);

    return resolve(repoRoot, i >= 0 ? process.argv[i + 1] : fallback);
};

const FROM = arg('--from', 'apps/showcase/dist/showcase/browser');
const OUT = arg('--out', 'site');

if (!existsSync(FROM)) {
    console.error(`✗ merge-showcase: no showcase build at ${relative(repoRoot, FROM)}`);
    console.error('    Build it first: pnpm --filter @angulux/showcase build');
    console.error('    (which needs the library built first: pnpm build:lib)');
    process.exit(1);
}

if (!existsSync(join(OUT, 'llms.txt'))) {
    console.error(`✗ merge-showcase: ${relative(repoRoot, OUT)} does not look like a built site — run tools/corpus/build-site.mjs first`);
    process.exit(1);
}

/** Every file under `dir`, as paths relative to it. */
function walk(dir, base = dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);

        statSync(full).isDirectory() ? walk(full, base, out) : out.push(relative(base, full).replace(/\\/g, '/'));
    }

    return out;
}

// The one file the showcase is allowed to take. Everything else is an address that already
// belongs to something, and taking it silently is the failure this guard exists to prevent.
const TAKEOVER = 'index.html';
const incoming = walk(FROM);
const collisions = incoming.filter((f) => f !== TAKEOVER && existsSync(join(OUT, f)));

if (collisions.length) {
    console.error(`✗ merge-showcase: ${collisions.length} file(s) would overwrite a published address:\n`);
    for (const f of collisions) console.error(`    ${f}`);
    console.error('\n    Rename the showcase asset, or move the corpus file. Do not resolve this by copy order.');
    process.exit(1);
}

// `errorOnExist` is what makes the refusal real. The pre-flight above exists to print the
// COMPLETE list in one go, which a throw cannot do — but a check taken a moment before the
// write is a decision about a state that may have changed since. The filesystem gets the
// final say, and `index.html` is excluded because it is the one file meant to be replaced.
cpSync(FROM, OUT, {
    recursive: true,
    force: false,
    errorOnExist: true,
    filter: (src) => relative(FROM, src).replace(/\\/g, '/') !== TAKEOVER
});

const shell = readFileSync(join(FROM, TAKEOVER));

// The one deliberate overwrite in this script.
writeFileSync(join(OUT, TAKEOVER), shell);

// GitHub Pages serves this for any path with no file. It is the app shell, so an unknown
// route lands in the router rather than on GitHub's 404.
writeFileSync(join(OUT, '404.html'), shell);

const corpus = JSON.parse(readFileSync(join(repoRoot, 'corpus/corpus.json'), 'utf8'));
let routes = 0;

for (const { name } of corpus.modules) {
    const dir = join(OUT, name);
    const target = join(dir, 'index.html');

    mkdirSync(dir, { recursive: true });

    // `wx` rather than a preceding existsSync: the check and the write are then one syscall,
    // and the refusal comes from the filesystem instead of from a decision taken a moment
    // earlier about a state that may since have changed.
    // `<module>.md` is a file and `<module>/` a directory: they coexist, and both are meant to.
    try {
        writeFileSync(target, shell, { flag: 'wx' });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;

        console.error(`✗ merge-showcase: ${name}/index.html already exists — a module name has collided with a rendered page`);
        process.exit(1);
    }

    routes++;
}

console.log(`✓ merge-showcase: ${incoming.length} file(s) + 404.html + ${routes} module route(s) → ${relative(repoRoot, OUT)}`);
console.log(`    root index.html is now the showcase; the LLM index stays at /llms/, llms.txt and every <module>.md are untouched.`);
