import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
 * WHAT IT DOES NOT COVER: the dark colour scheme, any state reached by interacting (an open
 * overlay, a focused field, an error message), and anything axe marks "incomplete" because it
 * could not decide. This is the page as it loads, in light.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BASELINE_FILE = join(__dirname, 'axe-baseline.json');

type Counts = Record<string, number>;
const baselineDoc = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as { $comment: string[]; pages: Record<string, Counts> };
const baseline = baselineDoc.pages;

/** Every page the site has: the three written pages and one per module in the registry. */
function readPages(): string[] {
    const src = readFileSync(join(__dirname, '../apps/showcase/src/doc/registry.ts'), 'utf8');
    const modules = [...src.matchAll(/^ {4}([a-z][\w]*): \[$/gm)].map((m) => m[1]);

    return ['/', '/getting-started', '/theming', ...modules.map((m) => `/${m}`)];
}

const PAGES = readPages();
const found: Record<string, Counts> = {};

test('the sweep covers the whole site, and every baseline entry is a page that exists', () => {
    // A registry the regex stopped matching would sweep three pages and report success.
    expect(PAGES.length).toBeGreaterThan(50);
    expect(Object.keys(baseline).filter((p) => !PAGES.includes(p))).toEqual([]);
});

test('axe can fail: an image with no alternative text is reported', async ({ page }) => {
    await page.goto('/button');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
        const img = document.createElement('img');
        img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
        document.querySelector('main')!.appendChild(img);
    });

    const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();

    expect(result.violations.map((v) => v.id)).toContain('image-alt');
});

for (const path of PAGES) {
    test(`${path} — no accessibility violation beyond the frozen baseline`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();

        // An engine that ran no rule reports no violation. Every page has at least a document
        // title and a language, so "nothing passed" means "nothing ran".
        expect(result.passes.length, 'axe ran no rule on this page').toBeGreaterThan(0);

        const counts: Counts = {};
        const over: string[] = [];
        const allowed = baseline[path] ?? {};

        for (const v of result.violations) {
            counts[v.id] = v.nodes.length;
            if (v.nodes.length > (allowed[v.id] ?? 0)) {
                over.push(`${v.id} (${v.impact}): ${v.nodes.length} element(s), ${allowed[v.id] ?? 0} frozen — ${v.help}\n` + v.nodes.map((n) => `      ${n.target.join(' ')}`).join('\n'));
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
