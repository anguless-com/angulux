import { type Page, expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * The counts at the top of a module page say "1 declaration" and "1 demo", and use the plural
 * for none and for more than one. Most modules declare a single component, so the singular is
 * the common case, and it read "1 declarations" on all of them.
 */

const pills = (page: Page) => page.locator('article header .rounded-full');

test('one declaration and one demo are singular', async ({ page }) => {
    await page.goto('/fluid');
    await hydrated(page);

    await expect(pills(page)).toHaveText(['1 declaration', '1 demo']);
});

test('none and more than one are plural', async ({ page }) => {
    await page.goto('/utils');
    await hydrated(page);
    await expect(pills(page)).toHaveText(['0 declarations']);

    await page.goto('/table');
    await hydrated(page);

    const [declarations, demos] = await pills(page).allTextContents();

    expect(declarations).toMatch(/^([2-9]|\d{2,}) declarations$/);
    expect(demos).toMatch(/^([2-9]|\d{2,}) demos$/);
});
