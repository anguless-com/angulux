import { type Page, expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * The API table (apps/showcase/src/components/api-table.ts).
 *
 * "not documented" is what most rows of the Default column say, and it used to break inside the
 * word: "documente / d" at 1440 wide. A word broken across two lines lays out as two boxes, so
 * each "documented" is measured with a Range: more than one client rect is a word split in two.
 * That holds in any font, which matters because the site uses the system's: what fits in SF on
 * a Mac may not fit in DejaVu on the Linux machine CI runs.
 *
 * On a desktop no table box may scroll. On a phone the input table is wider than the screen on
 * purpose and scrolls inside its box, so the check there is that the page itself does not, and
 * that every box which scrolls can be reached and scrolled from the keyboard.
 */

async function splitWords(page: Page): Promise<number> {
    return page.evaluate(() => {
        let split = 0;

        for (const span of document.querySelectorAll('agl-api-table td span')) {
            const text = span.firstChild;

            if (!(text instanceof Text) || text.data.trim() !== 'not documented') continue;

            const range = document.createRange();
            const at = text.data.indexOf('documented');

            range.setStart(text, at);
            range.setEnd(text, at + 'documented'.length);

            if (range.getClientRects().length > 1) split++;
        }

        return split;
    });
}

/** The table boxes that scroll sideways, and whether each is a named region in the tab order. */
async function scrollingBoxes(page: Page): Promise<{ reachable: boolean }[]> {
    return page.evaluate(() =>
        [...document.querySelectorAll('agl-api-table table')]
            .map((table) => table.parentElement!)
            .filter((box) => box.scrollWidth > box.clientWidth)
            .map((box) => ({ reachable: box.tabIndex === 0 && box.getAttribute('role') === 'region' && !!box.getAttribute('aria-label') }))
    );
}

for (const [label, viewport, phone] of [
    ['desktop 1440', { width: 1440, height: 900 }, false],
    ['laptop 1024', { width: 1024, height: 768 }, false],
    ['phone 412', { width: 412, height: 823 }, true]
] as const) {
    test(`${label}: "not documented" never breaks inside the word, and nothing scrolls sideways that cannot be reached`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/datepicker');
        await hydrated(page);

        const count = await page.locator('agl-api-table td span', { hasText: 'not documented' }).count();

        expect(count, 'the page has rows without a documented default').toBeGreaterThan(20);
        expect(await splitWords(page), 'cells where "documented" is broken across two lines').toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'horizontal overflow of the page').toBe(0);

        if (phone) {
            // The box takes its tab stop once it has been measured, just after the page settles.
            await expect.poll(async () => (await scrollingBoxes(page)).every((box) => box.reachable), 'every table box that scrolls is a named region in the tab order').toBe(true);
            expect((await scrollingBoxes(page)).length, 'the input table scrolls inside its box on a phone').toBeGreaterThan(0);
        } else {
            expect(await scrollingBoxes(page), 'API table boxes that scroll sideways').toEqual([]);
        }
    });
}

/**
 * Member names in the Input and Output columns. They break only where two words of a name meet
 * (the table puts a `<wbr>` there), never inside a word, unless one word alone is wider than the
 * column. Each word of a name is found in the text the same way the table cuts it, and measured
 * with a Range: a word that lays out as more than one box is a word split in two. Measuring
 * words rather than text nodes is what makes this fail without the `<wbr>`s, when the whole name
 * is one node. A word's natural width is measured on a copy that may not wrap.
 */
async function namesSplitInsideAWord(page: Page): Promise<{ split: string[]; spaced: string[]; names: number }> {
    return page.evaluate(() => {
        const split: string[] = [];
        const spaced: string[] = [];
        const spans = [...document.querySelectorAll('agl-api-table td:first-child > span.text-ink')];

        for (const span of spans) {
            const name = span.textContent ?? '';

            if (/\s/.test(name)) spaced.push(name);

            const cell = span.closest('td')!;
            const style = getComputedStyle(cell);
            const room = cell.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);

            for (const node of span.childNodes) {
                if (!(node instanceof Text) || !node.data) continue;

                let at = 0;

                for (const word of node.data.split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)) {
                    const range = document.createRange();

                    range.setStart(node, at);
                    range.setEnd(node, at + word.length);
                    at += word.length;

                    if (range.getClientRects().length < 2) continue;

                    const probe = document.createElement('span');

                    probe.style.whiteSpace = 'nowrap';
                    probe.textContent = word;
                    span.appendChild(probe);
                    const natural = probe.getBoundingClientRect().width;
                    probe.remove();

                    if (natural <= room) split.push(`${name} (in "${word}")`);
                }
            }
        }

        return { split, spaced, names: spans.length };
    });
}

for (const [label, viewport] of [
    ['desktop 1440', { width: 1440, height: 900 }],
    ['laptop 1024', { width: 1024, height: 768 }],
    ['phone 412', { width: 412, height: 823 }]
] as const) {
    test(`${label}: a member name breaks only where its words meet, and reads as one word`, async ({ page }) => {
        await page.setViewportSize(viewport);

        for (const path of ['/datepicker', '/table']) {
            await page.goto(path);
            await hydrated(page);

            const { split, spaced, names } = await namesSplitInsideAWord(page);

            expect(names, `${path} has member names`).toBeGreaterThan(20);
            expect(spaced, `${path}: names with a space in them`).toEqual([]);
            expect(split, `${path}: names broken inside a word that fits the column`).toEqual([]);
        }
    });
}

test('on a desktop the table boxes add no tab stops', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/datepicker');
    await hydrated(page);

    await expect(page.locator('agl-api-table [tabindex]')).toHaveCount(0);
});
