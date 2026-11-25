import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { hydrated } from './hydrated';
import { showcasePages } from './showcase-pages';

/**
 * axe-core over every page of the showcase, against a baseline that only shrinks.
 *
 * WHY: the project says "AXE-clean, WCAG AA" and until this file nothing ran axe. The static
 * template rules in `check:lint` see markup; they cannot see a computed accessible name, a
 * contrast ratio, or a scroll container the keyboard cannot reach. Those exist only in a
 * rendered page, so they are measured in one. The showcase is the right page: it renders
 * every shipped module with the markup a reader copies.
 *
 * WHY A BASELINE AND NOT ZERO: the first run found violations on 37 of 54 pages. Some belong to
 * the site, some to the library, and each needs reading before it is fixed. Refusing to land
 * the gate until all of them are gone would leave the count free to grow in the meantime. So
 * `axe-baseline.json` records, per page and per rule, how many elements failed on the day it
 * was frozen:
 *
 *   - more than recorded fails, and names the elements;
 *   - a page or rule that is not recorded starts at zero;
 *   - FEWER than recorded also fails, until the file is lowered to match, so a fix cannot
 *     leave room for the next regression. `AXE_PRUNE=1` lowers it; it takes the smaller of
 *     the two numbers and can never raise or add an entry.
 *
 * BOTH COLOUR SCHEMES, ONE BASELINE. Each page is swept in light and then in dark, inside one
 * test, and each sweep is held to the same per-page entry. Measured on 2026-11-25, dark had
 * exactly light's findings and nothing of its own, so no entry had to be added for it. One test
 * rather than two keeps `AXE_PRUNE` honest: it lowers an entry to what the page needs in its
 * worse scheme, which it can only know if both were measured in the same worker.
 *
 * WHAT IT DOES NOT COVER: any state reached by interacting (an open overlay, a focused field, an
 * error message), and anything axe marks "incomplete" because it could not decide. That is a lot
 * of colour contrast: about 5,200 elements on the site in either scheme, mostly text partly
 * covered by another element, or one or two characters long. This is the page as it loads.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BASELINE_FILE = join(__dirname, 'axe-baseline.json');

type Counts = Record<string, number>;
const baselineDoc = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as { $comment: string[]; pages: Record<string, Counts> };
const baseline = baselineDoc.pages;

const PAGES = showcasePages();
const found: Record<string, Counts> = {};

test('the sweep covers the whole site, and every baseline entry is a page that exists', () => {
    // A registry the regex stopped matching would sweep three pages and report success.
    expect(PAGES.length).toBeGreaterThan(50);
    expect(Object.keys(baseline).filter((p) => !PAGES.includes(p))).toEqual([]);
});

test('axe can fail: an image with no alternative text is reported', async ({ page }) => {
    await page.goto('/button');
    await page.waitForLoadState('networkidle');
    await hydrated(page);
    await page.evaluate(() => {
        const img = document.createElement('img');
        img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
        document.querySelector('main')!.appendChild(img);
    });

    const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();

    expect(result.violations.map((v) => v.id)).toContain('image-alt');
});

/**
 * Load a page in one colour scheme and run axe on it.
 *
 * The scheme is the one the reader's system asks for: with nothing stored, the inline script in
 * index.html follows `prefers-color-scheme` and sets the `dark` class before the first paint. The
 * class is checked, because a dark sweep of a light page would pass and prove nothing.
 */
async function sweep(page: Page, path: string, scheme: 'light' | 'dark') {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await hydrated(page);
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark')), `${path} is in the ${scheme} scheme`).toBe(scheme === 'dark');

    return new AxeBuilder({ page }).withTags(TAGS).analyze();
}

test('the dark sweep is dark: contrast broken only under .dark is reported in dark and not in light', async ({ page }) => {
    // Dark grey on the dark canvas (#0a0c10), about 1.7:1, set only under the dark class. Not the
    // canvas colour itself: at 1:1 axe reports "incomplete", since equal colours may mean text
    // hidden on purpose, and the test would prove nothing.
    const unreadable = '.dark main h1 { color: #333a46 !important; }';

    await sweep(page, '/getting-started', 'dark');
    await page.addStyleTag({ content: unreadable });
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id)).toContain('color-contrast');

    await sweep(page, '/getting-started', 'light');
    await page.addStyleTag({ content: unreadable });
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id)).not.toContain('color-contrast');
});

for (const path of PAGES) {
    test(`${path} — no accessibility violation beyond the frozen baseline, in light or in dark`, async ({ page }) => {
        const counts: Counts = {};
        const over: string[] = [];
        const allowed = baseline[path] ?? {};

        for (const scheme of ['light', 'dark'] as const) {
            const result = await sweep(page, path, scheme);

            // An engine that ran no rule reports no violation. Every page has at least a document
            // title and a language, so "nothing passed" means "nothing ran".
            expect(result.passes.length, `axe ran no rule on this page in ${scheme}`).toBeGreaterThan(0);

            for (const v of result.violations) {
                // The page needs what its worse scheme needs; that is what the entry is compared with.
                counts[v.id] = Math.max(counts[v.id] ?? 0, v.nodes.length);
                if (v.nodes.length > (allowed[v.id] ?? 0)) {
                    over.push(`${v.id} (${v.impact}), in ${scheme}: ${v.nodes.length} element(s), ${allowed[v.id] ?? 0} frozen — ${v.help}\n` + v.nodes.map((n) => `      ${n.target.join(' ')}`).join('\n'));
                }
            }
        }
        found[path] = counts;

        expect(over, `new accessibility violations on ${path}:\n\n${over.join('\n\n')}\n`).toEqual([]);

        if (!process.env.AXE_PRUNE) {
            const stale = Object.entries(allowed)
                .filter(([rule, n]) => (counts[rule] ?? 0) < n)
                .map(([rule, n]) => `${rule}: ${counts[rule] ?? 0} found, ${n} frozen`);

            expect(stale, `the baseline for ${path} allows more than the page now has. That is progress: lower e2e/axe-baseline.json (AXE_PRUNE=1 does it).`).toEqual([]);
        }
    });
}

test.afterAll(() => {
    if (!process.env.AXE_PRUNE) return;

    // Only pages measured by THIS worker are touched, and only downwards. The file is read
    // again here because another worker may have lowered other pages since this one started.
    const current = (JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as typeof baselineDoc).pages;
    const pages: Record<string, Counts> = {};

    for (const path of Object.keys(current).sort()) {
        const measured = found[path];
        const next: Counts = {};

        for (const rule of Object.keys(current[path]).sort()) {
            const n = measured ? Math.min(current[path][rule], measured[rule] ?? 0) : current[path][rule];

            if (n > 0) next[rule] = n;
        }
        if (Object.keys(next).length) pages[path] = next;
    }
    writeFileSync(BASELINE_FILE, JSON.stringify({ $comment: baselineDoc.$comment, pages }, null, 4) + '\n');
});
