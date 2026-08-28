#!/usr/bin/env node
/**
 * The three release trains, defined once.
 *
 * WHY ONE DEFINITION. The workflow already had these path lists inline, to decide whether a
 * train RUNS. The commit filter needs the same lists to decide which commits a train READS.
 * Two copies of the same list is how the gate and the filter come to disagree about what a
 * train covers — and the disagreement would surface as a published changelog crediting a
 * train with work that is not in it, which is the exact defect being fixed here.
 *
 * So the workflow now asks this file, and so does `rail-filter.mjs`.
 *
 * Usage as a CLI, which is how the shell step reads it:
 *   node release/rails.mjs angulux   ->  packages/angulux/
 *   node release/rails.mjs forks     ->  packages/angulux-styled/ packages/angulux-utils/ …
 *   node release/rails.mjs tools     ->  packages/angulux-license-guard/ packages/angulux-migrate/
 */

import { execFileSync } from 'node:child_process';

/**
 * A train covers the packages it publishes, and nothing else.
 *
 * `packages/angulux-mcp` is deliberately on none of them: it is `private: true` and never
 * published, so a commit touching only it must not bump any train — that is half of what
 * BL-60 was about.
 *
 * The `tools` train was added 2026-08-29. Both of its packages were published by hand and
 * declared in RELEASED_BY_HAND below, which was an honest description of a real decision —
 * until a security fix had to reach users. A hand publish cannot produce a provenance
 * attestation, because `npm publish --provenance` needs the OIDC token that only CI holds,
 * so "release by hand" and "every artifact we ship is verifiable" could not both stay true.
 * The train is how that was resolved.
 */
export const RAILS = {
    angulux: ['packages/angulux/'],
    forks: ['packages/angulux-styled/', 'packages/angulux-utils/', 'packages/angulux-styles/', 'packages/angulux-motion/'],
    tools: ['packages/angulux-license-guard/', 'packages/angulux-migrate/']
};

/**
 * Published, but on no train — released by hand, deliberately.
 *
 * EMPTY since 2026-08-29, and the export stays. It exists so that "not on a train" is a
 * DECLARED state rather than an omission: the test beside this file requires every
 * non-private workspace package to appear in exactly one of these lists, so a newly
 * published package that nobody placed turns that test red instead of quietly belonging
 * to no train and no gate. Emptying it is the point — there is now nowhere to put a
 * package except on a train.
 *
 * Do not delete the export to tidy up. An empty list that something asserts against is a
 * control; a deleted list is a hole that reads the same as "no problem".
 */
export const RELEASED_BY_HAND = [];

/**
 * The files one commit touched, as repo-relative paths.
 *
 * `git show`, not `git diff-tree`. The first draft used diff-tree and was wrong about the
 * ROOT commit: with no parent there is nothing to diff against, so it reports no files, and
 * the root commit would then belong to no train. That is not hypothetical — `release.yml`
 * falls back to the root commit as the base for a FIRST release of a train, so the one
 * release where every file is new is exactly the one that would have counted nothing.
 *
 * `git show --name-only` handles both, and reports nothing for a merge, which is the case
 * `commitTouchesRail` handles separately and deliberately.
 */
export function filesInCommit(hash, cwd = process.cwd()) {
    const out = execFileSync('git', ['show', '--name-only', '--format=', hash], { cwd, encoding: 'utf8' });

    return out.split('\n').filter(Boolean);
}

/** How many parents a commit has — the merge-commit check below reads this. */
export function parentCount(hash, cwd = process.cwd()) {
    const out = execFileSync('git', ['rev-list', '--parents', '-n', '1', hash], { cwd, encoding: 'utf8' });

    return out.trim().split(/\s+/).length - 1;
}

/**
 * Does this commit belong to this train?
 *
 * Merge commits are INCLUDED, deliberately. `git diff-tree` reports nothing for them, so a
 * naive read would exclude every merge — and this repository squash-merges, so a merge commit
 * on `main` is an anomaly rather than routine. Including it can only over-release, which is
 * the behaviour being replaced; excluding it could drop a real change from a changelog
 * silently, which is worse. The caller is told, so the anomaly does not pass unseen.
 */
export function commitTouchesRail(hash, rail, { cwd = process.cwd(), onMerge } = {}) {
    const prefixes = RAILS[rail];

    if (!prefixes) throw new Error(`unknown release train: ${rail}`);

    if (parentCount(hash, cwd) > 1) {
        onMerge?.(hash);

        return true;
    }

    return filesInCommit(hash, cwd).some((file) => prefixes.some((prefix) => file.startsWith(prefix)));
}

if (process.argv[1] && import.meta.filename.endsWith(process.argv[1].split(/[\\/]/).pop())) {
    const rail = process.argv[2];

    if (!RAILS[rail]) {
        console.error(`usage: node release/rails.mjs <${Object.keys(RAILS).join('|')}>`);
        process.exit(1);
    }

    console.log(RAILS[rail].join(' '));
}
