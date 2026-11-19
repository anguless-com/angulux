import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { judgeManifest, judgeOverrides, isExact } from '../lib/manifest-pins.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The gate over the half of Constitution P4 that lives outside `pnpm-workspace.yaml`: what a
 * manifest installs, and what the root manifest forces on the tree, is pinned exactly.
 */

const ws = { packages: [], catalog: { shiki: '4.6.0' }, catalogs: { angular22: { tslib: '2.8.1' } } };

test('exact, catalog and workspace specifiers pass', () => {
    const r = judgeManifest('p/package.json', { dependencies: { a: '1.2.3', b: 'workspace:^', shiki: 'catalog:' }, devDependencies: { tslib: 'catalog:angular22', c: '1.0.0-rc.1' } }, ws);
    assert.deepEqual(r.problems, []);
    assert.equal(r.examined, 5);
});

test('every form of "not exact" is a problem that names the manifest and the dependency', () => {
    for (const spec of ['^1.2.3', '~1.2.3', '>=1.2.3', '1.x', '*', 'latest', '1.2', 'npm:other@1.2.3', 'github:owner/repo', 'file:../x', '']) {
        const r = judgeManifest('p/package.json', { devDependencies: { dep: spec } }, ws);
        assert.equal(r.problems.length, 1, `"${spec}" should be refused`);
        assert.match(r.problems[0], /p\/package\.json devDependencies "dep/);
    }
});

test('optionalDependencies are installed too, so they are held to the rule', () => {
    assert.equal(judgeManifest('p', { optionalDependencies: { dep: '^1.0.0' } }, ws).problems.length, 1);
});

test('peerDependencies are never installed and are left alone', () => {
    const r = judgeManifest('p', { peerDependencies: { '@angular/core': '^22.0.0' } }, ws);
    assert.deepEqual([r.problems.length, r.examined], [0, 0]);
});

test('a catalog reference to an entry that does not exist is a problem, in either catalog', () => {
    assert.equal(judgeManifest('p', { dependencies: { missing: 'catalog:' } }, ws).problems.length, 1);
    assert.equal(judgeManifest('p', { dependencies: { tslib: 'catalog:angular99' } }, ws).problems.length, 1);
    // The right name in the wrong catalog is still a reference to nothing.
    assert.equal(judgeManifest('p', { dependencies: { tslib: 'catalog:' } }, ws).problems.length, 1);
});

test('overrides and resolutions must be exact, whatever the selector looks like', () => {
    const clean = judgeOverrides('package.json', { pnpm: { overrides: { postcss: '8.5.23', 'body-parser@<2': '1.20.9' } } });
    assert.deepEqual([clean.problems.length, clean.examined], [0, 2]);

    const ranged = judgeOverrides('package.json', { pnpm: { overrides: { hono: '^4.13.16', 'a>b': '$b' } }, resolutions: { zod: '>=4' } });
    assert.equal(ranged.problems.length, 3);
    assert.equal(ranged.examined, 3);
});

test('isExact refuses anything that is not a string', () => {
    assert.equal(isExact(undefined), false);
    assert.equal(isExact({ version: '1.2.3' }), false);
});

/** A copy of everything the gate reads, so a violation can be planted without touching the repo. */
function sandbox() {
    const root = mkdtempSync(join(tmpdir(), 'check-catalog-'));
    const tracked = execFileSync('git', ['-C', repoRoot, 'ls-files', 'package.json', 'pnpm-workspace.yaml', 'packages/*/package.json', 'apps/*/package.json'], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    for (const rel of tracked) {
        mkdirSync(dirname(join(root, rel)), { recursive: true });
        cpSync(join(repoRoot, rel), join(root, rel));
    }
    const edit = (rel, change) => {
        const file = join(root, rel);
        const json = JSON.parse(readFileSync(file, 'utf8'));
        change(json);
        writeFileSync(file, JSON.stringify(json, null, 4));
    };
    const run = () => spawnSync(process.execPath, [join(repoRoot, 'tools/check-catalog.mjs')], { cwd: root, encoding: 'utf8' });
    return { root, edit, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

test('end to end: the committed tree is green, and each planted range turns the gate red by name', () => {
    const s = sandbox();
    try {
        const green = s.run();
        assert.equal(green.status, 0, green.stderr);
        assert.match(green.stdout, /manifests clean/);

        // A range in a leaf manifest that never mentions the catalog.
        s.edit('packages/angulux-styles/package.json', (j) => (j.devDependencies.terser = '^5.51.2'));
        const leaf = s.run();
        assert.equal(leaf.status, 1);
        assert.match(leaf.stderr, /packages\/angulux-styles\/package\.json devDependencies "terser: \^5\.51\.2"/);
        s.edit('packages/angulux-styles/package.json', (j) => (j.devDependencies.terser = '5.51.2'));
        assert.equal(s.run().status, 0);

        // A ranged override.
        s.edit('package.json', (j) => (j.pnpm.overrides.postcss = '^8.5.23'));
        const forced = s.run();
        assert.equal(forced.status, 1);
        assert.match(forced.stderr, /pnpm\.overrides "postcss: \^8\.5\.23"/);
        s.edit('package.json', (j) => (j.pnpm.overrides.postcss = '8.5.23'));

        // A catalog reference to nothing.
        s.edit('apps/verify/package.json', (j) => (j.dependencies['left-pad'] = 'catalog:'));
        const dangling = s.run();
        assert.equal(dangling.status, 1);
        assert.match(dangling.stderr, /left-pad: catalog:" points at a catalog entry/);
    } finally {
        s.done();
    }
});

test('end to end: a workspace glob that matches no manifest fails instead of passing on nothing', () => {
    const s = sandbox();
    try {
        rmSync(join(s.root, 'apps'), { recursive: true });
        const r = s.run();
        assert.equal(r.status, 1);
        assert.match(r.stderr, /"apps\/\*" matches no package manifest/);
    } finally {
        s.done();
    }
});
