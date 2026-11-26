import { type Page, expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * The site's own icons stay out of what assistive technology reads.
 *
 * PrimeIcons draws each glyph in ::before as a private-use character, and generated content takes
 * part in accessible names and in the text a screen reader reads. The Copy buttons were named
 * "<glyph> Copy" on every page until each icon the site draws was marked aria-hidden.
 */

const PUA = /[-]/;

/** The lines of the page's accessibility tree that carry an icon glyph. */
const glyphLines = async (page: Page) => (await page.locator('body').ariaSnapshot()).split('\n').filter((line) => PUA.test(line));

/**
 * A button by its visible text: the glyph is generated content, so it is not in the text. The
 * template's line breaks around the text are, hence the whitespace either side.
 */
const buttonWithText = (page: Page, text: string) => page.locator('button').filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) });

test('the home page links are named by their text', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);

    await expect(page.locator('a[href="/getting-started"]').filter({ hasText: 'Get started' })).toHaveAccessibleName('Get started');
    // The header link has no text, only its icon and an aria-label.
    await expect(page.locator('a[href="https://github.com/anguless-com/angulux"]').filter({ hasText: 'GitHub' })).toHaveAccessibleName('GitHub');
});

test('the Copy buttons are named by their text', async ({ page }) => {
    await page.goto('/button');
    await hydrated(page);

    await expect(buttonWithText(page, 'Copy as Markdown')).toHaveAccessibleName('Copy as Markdown');
    await expect(buttonWithText(page, 'Copy').first()).toHaveAccessibleName('Copy');

    await page.goto('/getting-started');
    await hydrated(page);

    await expect(buttonWithText(page, 'Copy').first()).toHaveAccessibleName('Copy');
});

for (const path of ['/', '/getting-started', '/button', '/tag', '/avatar', '/chip', '/message', '/iconfield', '/menu']) {
    test(`no icon glyph is read anywhere on ${path}`, async ({ page }) => {
        await page.goto(path);
        await hydrated(page);

        expect(await glyphLines(page)).toEqual([]);
    });
}
