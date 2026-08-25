/**
 * rail-filter — a semantic-release plugin that shows a train only its own commits.
 *
 * THE DEFECT. `release.yml` gates each train on paths, and its own header used to imply that
 * this filtered the commits. It does not: the gate decides whether a train RUNS, and once it
 * runs, semantic-release analyses every commit since that train's tag. Measured on 2026-08-14
 * during the `22.2.0` release — both jobs printed `Analysis of 17 commits complete`, the same
 * seventeen.
 *
 * What that produced was not a broken build. It was a published changelog crediting a train
 * with work that is not in it: `feat(mcp)` (a package that is `private: true` and never
 * published) and `feat(site)` (the documentation site, in no package at all) both appeared
 * under **Features** in the release notes of the library AND of the four forks, and bumped
 * both to a minor when the honest answer was a patch.
 *
 * THE FIX. Wrap `commit-analyzer` and `release-notes-generator`, and hand each the subset of
 * commits that touched its train's packages. Both plugins take `context.commits`, so the
 * subset flows into the version decision and into the notes together — they cannot disagree
 * about which commits the release is made of.
 *
 * The path lists come from `rails.mjs`, which `release.yml` also reads. One definition: a
 * second copy is how the gate and the filter would come to cover different things, which is
 * the same class of defect one level up.
 *
 * Plugin options: `{ "rail": "angulux" | "forks", …passed through to the wrapped plugin }`.
 */

import { RAILS, commitTouchesRail } from './rails.mjs';

/** The commits this train may count, with what was dropped reported rather than assumed. */
function forRail({ rail }, context) {
    if (!RAILS[rail]) {
        throw new Error(`rail-filter: unknown rail "${rail}" — expected one of ${Object.keys(RAILS).join(', ')}`);
    }

    const { commits, logger, cwd } = context;
    const merges = [];
    const kept = commits.filter((commit) => commitTouchesRail(commit.hash, rail, { cwd, onMerge: (hash) => merges.push(hash) }));

    // Printed on every run, not only when something is dropped. A filter that is silent when
    // it removes nothing is a filter nobody can tell is switched on.
    logger.log(`rail-filter[${rail}]: ${kept.length} of ${commits.length} commit(s) touch ${RAILS[rail].join(', ')}`);

    for (const commit of commits) {
        if (!kept.includes(commit)) logger.log(`rail-filter[${rail}]:   skipped ${commit.hash.slice(0, 8)} ${commit.subject ?? ''}`);
    }

    // This repository squash-merges, so a merge commit on `main` is an anomaly. They are kept
    // rather than dropped — over-releasing is the behaviour being replaced, while silently
    // losing a real change from a changelog would be worse — but it is said out loud.
    for (const hash of merges) {
        logger.log(`rail-filter[${rail}]:   KEPT merge commit ${hash.slice(0, 8)} — diff-tree reports no files for a merge, so it is counted rather than dropped`);
    }

    return { ...context, commits: kept };
}

export async function analyzeCommits(pluginConfig, context) {
    const { analyzeCommits: wrapped } = await import('@semantic-release/commit-analyzer');

    return wrapped(pluginConfig, forRail(pluginConfig, context));
}

export async function generateNotes(pluginConfig, context) {
    const { generateNotes: wrapped } = await import('@semantic-release/release-notes-generator');

    return wrapped(pluginConfig, forRail(pluginConfig, context));
}
