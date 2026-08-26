/**
 * parse-changelog — turns the HTML of primeng.dev/changelog into structured facts.
 *
 * WHAT THIS MAY READ, AND WHY THE LINE IS HERE
 *
 * Constitution P1 forbids referencing PrimeTek material at the CODE level from `primeng@22`
 * onward. A changelog entry is not code: "Table: incorrect paginator after data change" is a
 * statement that a defect existed, which is a fact about the world and not a copyrightable
 * expression. Reading it tells us where to LOOK in our own tree; it does not tell us what
 * they typed, and it must never be used to find out.
 *
 * So this parser reads one page and extracts three things — version, date, entry text. It
 * follows no link, downloads no diff, and touches no package. `watch-changelog.mjs` holds
 * the matching runtime guard: exactly one URL is reachable from this tool.
 *
 * The distinction is not academic. The page happens to carry no commit or PR anchors at all
 * (verified 2026-08-26: zero `<a>` elements inside the entry lists), so today the wall is
 * enforced by the source as well as by us. That can change; the guard is what does not.
 *
 * FAILING LOUD ON MARKUP DRIFT
 *
 * The page is a rendered Angular app, not an API. Its class names are the only handle we
 * have, and a redesign upstream would silently turn this into a function that returns an
 * empty list — the exact false green this repo has been bitten by before. Two defences:
 *
 *   1. Zero releases parsed is an exception, never an empty array.
 *   2. Each section header states its own count ("Defect Fixes (15)"). That number is
 *      compared against the entries actually parsed, so a markup change that drops half the
 *      list is caught by the page's own arithmetic rather than by someone noticing.
 *
 * Usage: import { parseChangelog } from './parse-changelog.mjs'
 */

/** Named entities the page actually produces. A full table would be dead code. */
const ENTITIES = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' '
};

const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m]);

/** Collapse the whitespace Angular's template output leaves around interpolations. */
const text = (s) =>
    decode(s.replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Remove what carries no information but does carry angle brackets: inline icons (hundreds
 * of path elements) and Angular's empty-anchor comments, which sit between every pair of
 * interpolated nodes.
 */
const clean = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<!---->/g, '');

/**
 * The `<ul>…</ul>` that starts at or after `from`, with the index it starts at — the caller
 * needs the position to tell a highlight list from a section list. Null when there is none.
 */
function listAfter(html, from) {
    const start = html.indexOf('<ul', from);
    if (start === -1) return null;
    const end = html.indexOf('</ul>', start);
    if (end === -1) return null;
    return { start, html: html.slice(start, end) };
}

const itemsOf = (list) => [...list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

/**
 * Parse one entry row: a scope chip ("Table") and the sentence beside it.
 *
 * The chip is optional in principle — the row is still a fact without it — so a missing chip
 * yields `scope: null` rather than dropping the entry. Losing an entry is the worse failure:
 * an unscoped defect that never reaches the report is one we never look for.
 */
function parseEntry(li) {
    const scope = li.match(/whitespace-nowrap[^"]*">([^<]*)<\/span>/);
    const body = li.match(/<span class="text-sm">([\s\S]*?)<\/span>/);
    return {
        scope: scope ? text(scope[1]) : null,
        text: text(body ? body[1] : li)
    };
}

/**
 * @param {string} html raw HTML of primeng.dev/changelog
 * @returns {Array<{version: string, date: string|null, highlights: string[],
 *                  sections: Array<{label: string, declared: number, entries: Array<{scope: string|null, text: string}>}>}>}
 *          newest release first, in page order
 */
export function parseChangelog(html) {
    const page = clean(html);

    // The anchor is what makes a heading a VERSION heading; `<h2>` alone is not enough, and
    // matching on the visible text alone would pick up any heading shaped like a number.
    const heads = [...page.matchAll(/<h2\b[^>]*>\s*([0-9][0-9.]*)\s*<a\b[^>]*id="v[0-9][0-9-]*"/g)];
    if (heads.length === 0) {
        throw new Error(
            'parse-changelog: no version headings found. The page markup changed — re-read it and fix the selectors here rather than treating an empty result as "no news".'
        );
    }

    return heads.map((head, i) => {
        const from = head.index;
        const to = i + 1 < heads.length ? heads[i + 1].index : page.length;
        const block = page.slice(from, to);

        const date = block.match(/<span class="flex items-center gap-1\.5[^"]*">\s*([^<]*?)\s*<\/span>/);

        // "Defect Fixes (15)". A label without a count is a status pill ("Latest"), not a
        // section, and the count is the self-check that makes drift visible.
        const labels = [...block.matchAll(/<span class="p-tag-label"[^>]*>([^<]*)<\/span>/g)]
            .map((m) => ({ at: m.index, named: text(m[1]).match(/^(.+?)\s*\((\d+)\)$/) }))
            .filter((l) => l.named);

        // The highlight list is the one before any section header. Taking "the first list"
        // outright would silently republish a release's defect list as its highlights when a
        // release ships without highlights — every entry counted twice, and nothing to notice.
        const sectionsStart = labels.length > 0 ? labels[0].at : block.length;
        const first = listAfter(block, 0);
        const highlights = first && first.start < sectionsStart ? itemsOf(first.html).map(text).filter(Boolean) : [];

        const sections = [];
        for (const { at, named } of labels) {
            const list = listAfter(block, at);
            const entries = list ? itemsOf(list.html).map(parseEntry).filter((e) => e.text) : [];
            const declared = Number(named[2]);
            if (entries.length !== declared) {
                throw new Error(
                    `parse-changelog: "${named[0]}" in ${head[1]} declares ${declared} entries but ${entries.length} were parsed. The markup changed; fix the selectors instead of trusting the shorter list.`
                );
            }
            sections.push({ label: named[1], declared, entries });
        }

        return { version: head[1], date: date ? text(date[1]) : null, highlights, sections };
    });
}
