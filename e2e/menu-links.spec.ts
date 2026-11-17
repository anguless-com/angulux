import { expect, test } from '@playwright/test';

/**
 * A menu item that is a plain link (`url`) and names no `target` opens in the tab it is in.
 *
 * Menu and TieredMenu bound the item's target to the link's `target` property. For an item
 * without one, that wrote `target="undefined"`, which the browser reads as a window named
 * "undefined": the link opened in a new tab (measured 2026-11-18). HTML's rule is that a link
 * without a target opens in its own browsing context. The page is apps/verify/src/menu-links.ts.
 */
for (const [name, host] of [
    ['Menu', '#links-menu'],
    ['TieredMenu', '#links-tiered']
]) {
    test(`${name}: a link item without a target opens in the same tab`, async ({ page, context }) => {
        await page.goto('/menu-links');
        const same = page.locator(`${host} a`, { hasText: 'Same tab' });
        await expect(same).toBeVisible();
        expect.soft(await same.getAttribute('target'), 'the target attribute of a link that names none').toBeNull();

        await same.click();
        await page.waitForTimeout(500);
        expect(context.pages().length, 'tabs open after the click').toBe(1);
        expect(new URL(page.url()).hash).toBe('#same-tab');
    });

    test(`${name}: a link item with a target keeps it`, async ({ page }) => {
        await page.goto('/menu-links');
        await expect(page.locator(`${host} a`, { hasText: 'New tab' })).toHaveAttribute('target', '_blank');
    });
}
