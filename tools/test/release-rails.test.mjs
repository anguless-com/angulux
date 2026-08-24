import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAILS, RELEASED_BY_HAND, commitTouchesRail, filesInCommit } from '../../release/rails.mjs';

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
 */

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

test('the commits this session shipped touch NEITHER train', () => {
    // Real history, not a fixture. All four changed the corpus, the tooling and the docs site,
    // and none of them changed a published package — yet under the old arrangement every one
    // would have bumped both trains and been advertised under Features.
    for (const hash of ['f9b65d0', '812c00b', 'e34a237', 'c8355e4']) {
        assert.equal(commitTouchesRail(hash, 'angulux', { cwd: repoRoot }), false, `${hash} should not be on the library train`);
        assert.equal(commitTouchesRail(hash, 'forks', { cwd: repoRoot }), false, `${hash} should not be on the fork train`);
    }
});

test('a commit that spans both trains is counted by both', () => {
    // `fix(menu)` (#122) changed `packages/angulux/src/menu` AND
    // `packages/angulux-utils/src/dom/methods/absolutePosition.ts`. The brain recorded it as
    // library-only and called its appearance in the forks' changelog a defect; the diff says
    // otherwise, and both trains are right to count it. Kept as a test so the correction is
    // not re-litigated from memory.
    const files = filesInCommit('3cabd0f', repoRoot);

    assert.ok(
        files.includes('packages/angulux-utils/src/dom/methods/absolutePosition.ts'),
        'the premise of this test is that fix(menu) really did touch a fork package'
    );
    assert.equal(commitTouchesRail('3cabd0f', 'angulux', { cwd: repoRoot }), true);
    assert.equal(commitTouchesRail('3cabd0f', 'forks', { cwd: repoRoot }), true);
});

test('a commit in only one train is counted by only that one', () => {
    // `test(radiobutton)` touched `packages/angulux/src` and nothing else.
    assert.equal(commitTouchesRail('74f6495', 'angulux', { cwd: repoRoot }), true);
    assert.equal(commitTouchesRail('74f6495', 'forks', { cwd: repoRoot }), false);
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
