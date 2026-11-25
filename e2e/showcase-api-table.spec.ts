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

test('on a desktop the table boxes add no tab stops', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/datepicker');
    await hydrated(page);

    await expect(page.locator('agl-api-table [tabindex]')).toHaveCount(0);
});
