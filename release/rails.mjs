#!/usr/bin/env node
/**
 * The two release trains, defined once.
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
 */

import { execFileSync } from 'node:child_process';

/**
 * A train covers the packages it publishes, and nothing else.
 *
 * `packages/angulux-mcp` and `packages/angulux-license-guard` are deliberately in neither:
 * the first is `private: true` and never published, the second releases by hand. A commit
 * touching only those must not bump either train — that is half of what BL-60 was about.
 */
export const RAILS = {
    angulux: ['packages/angulux/'],
    forks: ['packages/angulux-styled/', 'packages/angulux-utils/', 'packages/angulux-styles/', 'packages/angulux-motion/']
};

/**
 * Published, but on neither train — released by hand, deliberately.
 *
 * They exist so that "not on a train" is a DECLARED state rather than an omission. A new
 * published package that nobody placed would otherwise be covered by no train and no gate,
 * and the first sign of it would be a release that silently never included it. The test
 * beside this file requires every non-private workspace package to appear in exactly one of
 * these two lists.
 */
export const RELEASED_BY_HAND = ['packages/angulux-license-guard/', 'packages/angulux-migrate/'];

/** The files one commit touched, as repo-relative paths. */
export function filesInCommit(hash, cwd = process.cwd()) {
    const out = execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', hash], { cwd, encoding: 'utf8' });

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
