import { expect, test } from '@playwright/test';

/**
 * Components at phone widths: nothing may reach past the edge of the screen.
 *
 * WCAG 1.4.10 (Reflow) asks that content be usable at 320 CSS pixels wide without scrolling in two
 * directions. Measured 2026-11-18, before the fix:
 * - Toast is 25rem (400px) wide whatever the screen, and sits 20px from its corner. On a 375px
 *   phone the first 45px of every message were off the left edge, the severity icon with them.
 * - The FileUpload header kept Choose, Upload and Cancel on one line: 394px of buttons on a 375px
 *   screen, so the page scrolled sideways and Cancel was cut.
 *
 * The page is apps/verify/src/narrow.ts.
 */

const WIDTHS = [375, 360, 320];
const POSITIONS = ['top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center', 'center'];

for (const width of WIDTHS) {
    test.describe(`${width}px wide`, () => {
        test.use({ viewport: { width, height: 700 } });

        for (const position of POSITIONS) {
            test(`a ${position} toast is wholly on screen`, async ({ page }) => {
                await page.goto(`/narrow?position=${position}`);
                await page.locator('#show-toast').click();
                const message = page.locator('.p-toast-message');
                await expect(message).toBeVisible();
                await expect(page.locator('.p-toast-detail')).toBeVisible();
                // Wait for the enter motion to end: the box is measured where it comes to rest.
                await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
                const box = await message.evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    return { left: Math.round(r.left), right: Math.round(r.right) };
                });
                expect(box.left, 'left edge of the toast').toBeGreaterThanOrEqual(0);
                expect(box.right, 'right edge of the toast').toBeLessThanOrEqual(width);
                const icon = await page.locator('.p-toast-message-icon').evaluate((el) => Math.round(el.getBoundingClientRect().left));
                expect(icon, 'the severity icon').toBeGreaterThanOrEqual(0);
            });
        }

        test('the FileUpload header keeps its three buttons on screen, and the page does not scroll sideways', async ({ page }) => {
            await page.goto('/narrow');
            const buttons = page.locator('#sec-fileupload .p-fileupload-header > *');
            await expect(buttons.first()).toBeVisible();
            const edges = await buttons.evaluateAll((list) => list.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => Math.round(r.right)));
            expect(edges.length).toBeGreaterThanOrEqual(3);
            for (const right of edges) expect(right, 'right edge of a header button').toBeLessThanOrEqual(width);
            expect(await page.evaluate(() => document.documentElement.scrollWidth), 'page width').toBeLessThanOrEqual(width);
        });
    });
}

test('on a wide screen the toast keeps the width its theme gives it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/narrow');
    await page.locator('#show-toast').click();
    await expect(page.locator('.p-toast-message')).toBeVisible();
    expect(await page.locator('.p-toast').evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(400);
});
