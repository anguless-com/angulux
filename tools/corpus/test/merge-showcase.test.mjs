import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = join(repoRoot, 'tools/corpus/merge-showcase.mjs');
const MODULES = JSON.parse(readFileSync(join(repoRoot, 'corpus/corpus.json'), 'utf8')).modules.map((m) => m.name);

/**
 * The step that hands the host root to the human documentation site.
 *
 * Everything worth testing here is a refusal. `llms.txt` and every `<module>.md` are
 * addresses assistants fetch by convention, and the cost of overwriting one is not a broken
 * build — it is a dead URL that nothing in this repository would ever report. So the merge
 * takes exactly one file, and treats every other collision as a failure rather than letting
 * copy order decide.
 */

/** A minimal built site and a minimal showcase build, in a throwaway directory. */
function fixture({ siteFiles = {}, showcaseFiles = {} } = {}) {
    const root = mkdtempSync(join(tmpdir(), 'merge-showcase-'));
    const site = join(root, 'site');
    const build = join(root, 'build');

    for (const [dir, files] of [
        [site, { 'llms.txt': 'corpus index', 'button.md': '# button', 'llms/index.html': '<p>corpus landing', 'index.html': '<p>corpus landing', ...siteFiles }],
        [build, { 'index.html': '<agl-showcase-root></agl-showcase-root>', 'main.js': 'boot();', ...showcaseFiles }]
    ]) {
        for (const [name, contents] of Object.entries(files)) {
            const target = join(dir, name);

            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, contents);
        }
    }

    return { root, site, build, run: () => spawnSync(process.execPath, [SCRIPT, '--from', build, '--out', site], { encoding: 'utf8' }) };
}

test('the root index is taken over, and nothing else is', () => {
    const f = fixture();
    const result = f.run();

    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(join(f.site, 'index.html'), 'utf8'), /agl-showcase-root/, 'the front door is now the app');
    assert.equal(readFileSync(join(f.site, 'llms.txt'), 'utf8'), 'corpus index', 'the address assistants fetch is untouched');
    assert.equal(readFileSync(join(f.site, 'button.md'), 'utf8'), '# button');
    assert.match(readFileSync(join(f.site, 'llms/index.html'), 'utf8'), /corpus landing/, 'the corpus landing page did not move, it stopped being the root');

    rmSync(f.root, { recursive: true, force: true });
});

test('a collision on anything but the root index fails the build', () => {
    // The failure this prevents is silent: an overwritten llms.txt still deploys, still
    // returns 200, and is wrong for every assistant that fetches it.
    const f = fixture({ showcaseFiles: { 'llms.txt': 'the app would have won' } });
    const result = f.run();

    assert.equal(result.status, 1);
    assert.match(result.stderr, /would overwrite a published address/);
    assert.match(result.stderr, /llms\.txt/);
    assert.equal(readFileSync(join(f.site, 'llms.txt'), 'utf8'), 'corpus index', 'and it refuses before writing anything');

    rmSync(f.root, { recursive: true, force: true });
});

test('every module gets a directory index, so the 64 real pages answer 200', () => {
    // GitHub Pages has no SPA fallback. Without these, every documented URL is a 404 that
    // only renders correctly because 404.html happens to be the app.
    const f = fixture();

    f.run();

    for (const name of [MODULES[0], MODULES.at(-1), 'button']) {
        assert.match(readFileSync(join(f.site, name, 'index.html'), 'utf8'), /agl-showcase-root/, `${name}/index.html must exist`);
    }

    assert.match(readFileSync(join(f.site, '404.html'), 'utf8'), /agl-showcase-root/, 'and anything else lands in the router, not on GitHub');

    rmSync(f.root, { recursive: true, force: true });
});

test('running it twice fails rather than quietly rewriting a published tree', () => {
    // Not a nicety. `build-site.mjs` wipes `site/` before rendering, so a second merge means
    // the pipeline was not run from the start — and the useful answer to that is a refusal,
    // not a second copy over the top of the first.
    const f = fixture();

    assert.equal(f.run().status, 0);
    assert.equal(f.run().status, 1, 'a merge onto an already-merged site is a mistake, and says so');

    rmSync(f.root, { recursive: true, force: true });
});

test('it refuses to run against things that are not what it says they are', () => {
    const missingBuild = fixture();

    rmSync(missingBuild.build, { recursive: true, force: true });
    assert.match(missingBuild.run().stderr, /no showcase build at/);
    rmSync(missingBuild.root, { recursive: true, force: true });

    const notASite = fixture();

    rmSync(join(notASite.site, 'llms.txt'));
    assert.match(notASite.run().stderr, /does not look like a built site/);
    rmSync(notASite.root, { recursive: true, force: true });
});
