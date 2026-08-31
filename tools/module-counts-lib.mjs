/**
 * The two questions check-module-counts asks, separated from the file list it asks them about.
 *
 * They live here so they can be tested against fixture strings instead of against the
 * repository — a test that mutates README.md to prove a gate bites is a test that leaves the
 * working tree dirty when it fails halfway.
 */

/**
 * Build a site regex from a template containing `%N%`.
 *
 * Digits only, unlike check-gate-count's equivalent. These counts are all past twenty, which is
 * where that gate's spelled-out word list deliberately stops, and refusing words also sidesteps
 * the trap it records at its own site list: inside an alternation, `eight` matches happily in
 * the middle of `eighteen` unless a literal suffix forces the backtrack.
 */
export const site = (template) => new RegExp(template.replace('%N%', '(\\d+)'), 'g');

/**
 * Every mismatch one site produces, as human-readable lines. Empty means the site is right.
 *
 * A site that matches NOTHING is a failure, not a pass. Rewording a sentence until this gate
 * can no longer find its number has precisely the effect of deleting the site, so it has to be
 * reported rather than skipped — otherwise the way to silence the gate is to write worse prose.
 */
export function auditSite(text, rx, expected, fact) {
    const hits = [...text.matchAll(rx)];
    if (!hits.length) {
        return [`no phrase matching ${rx.source} — a reword left the ${fact} count uncheckable`];
    }
    const problems = [];
    for (const m of hits) {
        const found = Number(m[1]);
        if (found !== expected) {
            problems.push(`"${m[0].trim()}" says ${found}, but ${fact} is ${expected}`);
        }
    }
    return problems;
}

/**
 * The question counting cannot ask: does the cost table list the modules the attic holds?
 *
 * Both directions matter and they fail differently. A promoted module left in the table sends
 * the next contributor to pick something already shipped. A new attic module with no row is
 * invisible to anyone choosing work. Every count on the page can be correct while either is
 * true, which is why this is a set comparison and not a length check.
 */
export function auditTable(atticModules, tabled) {
    const problems = [];
    for (const m of atticModules.filter((m) => !tabled.includes(m))) {
        problems.push(`no row for \`${m}\`, which is in attic/`);
    }
    for (const m of tabled.filter((m) => !atticModules.includes(m))) {
        problems.push(`lists \`${m}\`, which is not in attic/ — promoted, or renamed`);
    }
    return problems;
}
