/**
 * triage — decides what an upstream changelog entry can possibly mean for angulux.
 *
 * One rule, turned into code. It was first written down when PrimeNG v22 deprecated fourteen
 * things at once and every one of them had to have its replacement LOCATED before "should we
 * follow this?" was even a sensible question. Generalised here to every kind of entry:
 *
 *     An upstream change is only followable when the thing it points at is reachable here.
 *
 * "Following upstream" sounds like moving in the same direction. When the subject of the
 * entry lives behind the commercial licence, it is not a shared direction at all — it is a
 * sentence about software we may not read, describing a component we do not have.
 *
 * So every entry is sorted by ONE question — does the thing it names exist in this tree? —
 * and only the `follow` bucket produces work. The rest are filed so that the next run does
 * not re-litigate them.
 *
 * WHAT A `follow` VERDICT IS NOT: it is not "port their fix". Nothing here reads their fix.
 * It says a defect was reported against a component we also ship, so the honest next step is
 * to reproduce it against angulux and, if it reproduces, fix it our own way — which for a
 * fork that diverged at 21.1.9 may be a different bug, in a different place, or no bug at all.
 *
 * Usage: import { createTriage, VERDICTS } from './triage.mjs'
 */

export const VERDICTS = {
    /** Names a module angulux ships. Reproduce it here; fix it our way if it reproduces. */
    follow: 'follow',
    /** Names one of the parked modules. Real, but nothing ships it — revisit on promotion. */
    attic: 'attic',
    /** Scoped to the framework itself. The sentence names the affected parts; a human reads it. */
    crossCutting: 'cross-cutting',
    /** Names nothing in this tree: a component that only exists upstream, or a rename we did not follow. */
    outOfReach: 'out-of-reach',
    /** About their own site or docs. Never ours. */
    upstreamOnly: 'upstream-only'
};

/**
 * Chips that are not module names.
 *
 * Kept deliberately small. The temptation is to map every upstream component onto "the one
 * we would have called it" — but a guessed mapping produces confident work on the wrong file,
 * and `out-of-reach` is the honest answer when we cannot tell a v22-only component from a
 * rename. Add a row here only after reading our own source and confirming the destination.
 */
const ALIASES = {
    // primeng/api → angulux/api: packages/angulux/src/api/filterservice.ts
    filterservice: 'api',
    // Their framework layer. We have `base`/`basecomponent`/`config`, but which one an entry
    // touches depends on the sentence, so this resolves to a verdict rather than a module.
    core: null,
    docs: null
};

const SCOPE_VERDICT = {
    core: VERDICTS.crossCutting,
    docs: VERDICTS.upstreamOnly
};

const normalise = (scope) => (scope ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * @param {{closure: string[], attic: string[]}} tree
 *        `closure` — the 64 modules the package ships (tools/scope/closure.json).
 *        `attic`   — the parked modules (packages/angulux/attic).
 * @returns {(entry: {scope: string|null, text: string}) => {module: string|null, verdict: string, reason: string}}
 */
export function createTriage({ closure, attic }) {
    const shipped = new Set(closure);
    const parked = new Set(attic);

    return function triage(entry) {
        const key = normalise(entry.scope);

        if (!key) {
            return {
                module: null,
                verdict: VERDICTS.crossCutting,
                reason: 'no scope on the entry — read the sentence'
            };
        }

        if (key in SCOPE_VERDICT) {
            return { module: null, verdict: SCOPE_VERDICT[key], reason: `upstream scope "${entry.scope}"` };
        }

        const module = ALIASES[key] ?? key;

        if (shipped.has(module)) {
            return {
                module,
                verdict: VERDICTS.follow,
                reason: `angulux/${module} is in the shipped closure`
            };
        }

        if (parked.has(module)) {
            return {
                module,
                verdict: VERDICTS.attic,
                reason: `${module} is parked in attic/ — nothing ships it`
            };
        }

        return {
            module: null,
            verdict: VERDICTS.outOfReach,
            reason: `no module named "${module}" in the closure or the attic — upstream-only, or a rename we did not follow`
        };
    };
}
