import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAILS, RELEASED_BY_HAND, commitTouchesRail, filesInCommit, parentCount } from '../../release/rails.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * BL-60. `release.yml` gates each train on paths, and its own header used to imply that the
 * gate filtered the commits. It does not — it decides whether a train RUNS, and once it runs
 * semantic-release analyses every commit since that train's tag.
 *
 * Measured 2026-08-14 during the 22.2.0 release: both trains printed `Analysis of 17 commits
 * complete`, the same seventeen. `feat(mcp)` — a package that is `private: true` — and
 * `feat(site)` — the documentation site, in no package at all — bumped BOTH trains to a minor
 * and were published under **Features** in both sets of release notes.
 *
 * Nothing broke. A changelog said something untrue, in public, about what a release contains.
 *
 * WHY THESE TESTS BUILD THEIR OWN REPOSITORY. The first version asserted against this
 * repository's history by commit hash, and it was right about the facts and wrong about where
 * to check them: CI checks out shallow, so every one of those objects was `unknown revision`
 * on the runner. A test that only passes on a full clone is a test that does not run where it
 * matters. The evidence from real history is in the commit message; what belongs here is real
 * GIT behaviour, which a throwaway repository exercises exactly as well — and better, since it
 * can contain a merge commit, which `main` never does.
 */

/** A throwaway repository, and a `commit(files)` that returns the new hash. */
function scratchRepo() {
    const dir = mkdtempSync(join(tmpdir(), 'rails-'));
    const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();

    git('init', '--quiet', '--initial-branch=main');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'test');

    const commit = (files, message = 'test') => {
        for (const [path, contents] of Object.entries(files)) {
            const target = join(dir, path);

            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, contents);
        }

        git('add', '-A');
        git('commit', '--quiet', '-m', message);

        return git('rev-parse', 'HEAD');
    };

    return { dir, git, commit, dispose: () => rmSync(dir, { recursive: true, force: true }) };
}

test('every published package is on a train or declared as released by hand', () => {
    // The drift this catches: a new published package that nobody placed would be covered by
    // no train and no gate, and the first sign of it would be a release that silently never
    // included it. "Not on a train" has to be a decision someone wrote down.
    const placed = [...Object.values(RAILS).flat(), ...RELEASED_BY_HAND];
    const unplaced = [];

    for (const entry of readdirSync(join(repoRoot, 'packages'))) {
        const manifest = join(repoRoot, 'packages', entry, 'package.json');

        if (!existsSync(manifest)) continue;
        if (JSON.parse(readFileSync(manifest, 'utf8')).private === true) continue;

        const path = `packages/${entry}/`;

        if (!placed.includes(path)) unplaced.push(path);
    }

    assert.deepEqual(unplaced, [], 'these packages publish but belong to no train and are not declared released-by-hand');
});

test('a path is on at most one train — a package cannot be released twice', () => {
    const all = [...Object.values(RAILS).flat(), ...RELEASED_BY_HAND];

    assert.equal(new Set(all).size, all.length, 'a path appears in more than one list');
});

test('every declared path is a real directory', () => {
    // A renamed package would otherwise leave a train pointed at nothing: the gate would say
    // "no changes", the train would never run, and the release would look correct.
    for (const path of [...Object.values(RAILS).flat(), ...RELEASED_BY_HAND]) {
        assert.ok(existsSync(join(repoRoot, path)), `${path} does not exist`);
    }
});

test('a commit that touches no published package is on neither train', () => {
    // The defect, in one assertion. `feat(site)` and `feat(mcp)` looked exactly like this and
    // bumped both trains to a minor.
    const repo = scratchRepo();
    const hash = repo.commit({ 'apps/showcase/src/app.ts': 'x', 'corpus/corpus.json': '{}' });

    assert.equal(commitTouchesRail(hash, 'angulux', { cwd: repo.dir }), false);
    assert.equal(commitTouchesRail(hash, 'forks', { cwd: repo.dir }), false);

    repo.dispose();
});

test('a commit in one train is counted by that train alone', () => {
    const repo = scratchRepo();
    const hash = repo.commit({ 'packages/angulux/src/menu/menu.ts': 'x' });

    assert.equal(commitTouchesRail(hash, 'angulux', { cwd: repo.dir }), true);
    assert.equal(commitTouchesRail(hash, 'forks', { cwd: repo.dir }), false);

    repo.dispose();
});

test('a commit that spans both trains is counted by both', () => {
    // Not hypothetical: `fix(menu)` (#122) changed `packages/angulux/src/menu/menu.ts` AND
    // `packages/angulux-utils/src/dom/methods/absolutePosition.ts`. The brain filed it as
    // library-only and called its appearance in the forks' changelog part of this defect; the
    // diff disagrees, and both trains are right to count it.
    const repo = scratchRepo();
    const hash = repo.commit({
        'packages/angulux/src/menu/menu.ts': 'x',
        'packages/angulux-utils/src/dom/methods/absolutePosition.ts': 'y'
    });

    assert.equal(commitTouchesRail(hash, 'angulux', { cwd: repo.dir }), true);
    assert.equal(commitTouchesRail(hash, 'forks', { cwd: repo.dir }), true);

    repo.dispose();
});

test('a prefix match is a directory match, not a string match', () => {
    // `packages/angulux/` must not be satisfied by `packages/angulux-utils/…`. The trailing
    // slash in every rail entry is what makes that true, and it is easy to drop.
    const repo = scratchRepo();
    const hash = repo.commit({ 'packages/angulux-styles/src/index.ts': 'x' });

    assert.equal(commitTouchesRail(hash, 'angulux', { cwd: repo.dir }), false, 'angulux-styles is not angulux');
    assert.equal(commitTouchesRail(hash, 'forks', { cwd: repo.dir }), true);

    repo.dispose();
});

test('a merge commit is counted, and reported rather than passed over', () => {
    // `git show --name-only` reports no files for a merge, so a naive read excludes every one. This
    // repository squash-merges, so a merge on `main` is an anomaly worth surfacing — and
    // over-releasing is the behaviour being replaced, while losing a real change would be
    // worse. Only a real merge commit proves the branch, which is the other reason these
    // tests build a repository instead of reading this one.
    const repo = scratchRepo();

    repo.commit({ 'README.md': 'base' });
    repo.git('checkout', '--quiet', '-b', 'side');
    repo.commit({ 'docs/notes.md': 'side' });
    repo.git('checkout', '--quiet', 'main');
    repo.commit({ 'README.md': 'main moved on' });
    repo.git('merge', '--quiet', '--no-ff', '-m', 'merge side', 'side');

    const hash = repo.git('rev-parse', 'HEAD');
    const seen = [];

    assert.equal(parentCount(hash, repo.dir), 2, 'the premise is a real merge commit');
    assert.deepEqual(filesInCommit(hash, repo.dir), [], 'git really does report no files for a merge');
    assert.equal(commitTouchesRail(hash, 'angulux', { cwd: repo.dir, onMerge: (h) => seen.push(h) }), true);
    assert.deepEqual(seen, [hash], 'and the caller is told, so the anomaly does not pass unseen');

    repo.dispose();
});

test('the ROOT commit reports its files — the first release of a train depends on it', () => {
    // The bug the first draft shipped. `git diff-tree` has nothing to diff a parentless commit
    // against and reports no files, so the root commit belonged to no train — and `release.yml`
    // falls back to the root commit as the base for a train's FIRST release. The one release
    // where every file is new is exactly the one that would have counted nothing.
    const repo = scratchRepo();
    const hash = repo.commit({ 'packages/angulux/src/menu/menu.ts': 'x' });

    assert.equal(parentCount(hash, repo.dir), 0, 'the premise is a parentless commit');
    assert.deepEqual(filesInCommit(hash, repo.dir), ['packages/angulux/src/menu/menu.ts']);
    assert.equal(commitTouchesRail(hash, 'angulux', { cwd: repo.dir }), true);

    repo.dispose();
});

test('an unknown train is an error, never an empty filter', () => {
    // Silently matching nothing would mean a misspelt rail name produced a release with no
    // commits and no explanation.
    assert.throws(() => commitTouchesRail('HEAD', 'liberry', { cwd: repoRoot }), /unknown release train/);
});

test('the CLI prints what the workflow will word-split', () => {
    // `release.yml` runs this and passes the result to `git diff -- …` unquoted.
    const out = execFileSync(process.execPath, [join(repoRoot, 'release/rails.mjs'), 'forks'], { cwd: repoRoot, encoding: 'utf8' });

    assert.deepEqual(out.trim().split(' '), RAILS.forks);
});

test('release.yml reads the path lists rather than repeating them', () => {
    // The whole point of rails.mjs. A second copy in the workflow is how the gate and the
    // filter come to cover different things — the same defect one level up.
    const workflow = readFileSync(join(repoRoot, '.github/workflows/release.yml'), 'utf8');

    assert.match(workflow, /node release\/rails\.mjs angulux/);
    assert.match(workflow, /node release\/rails\.mjs forks/);

    for (const path of RAILS.forks) {
        assert.ok(!workflow.includes(`-- ${path}`), `release.yml still names ${path} inline`);
    }
});
