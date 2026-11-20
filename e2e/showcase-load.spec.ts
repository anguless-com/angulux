import { expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * The showcase hydrates its pages and deliberately does NOT hydrate the demos inside them
 * (`apps/showcase/src/components/demo-host.ts` says why). This is the case that decided it:
 * hydrated, the inline DatePicker kept its prerendered calendar in the DOM and left it hidden.
 *
 * Proven to fail: with `ngSkipHydration` taken off the demo host, the calendar is not visible
 * and this test is red.
 *
 * What hydration was turned on FOR — no layout jump, no second render — is not asserted here.
 * It was tried, and on the development server this gate runs against, the old two-pass render
 * finishes inside one frame and records no shift at all: the assertion passed on the unfixed
 * code. That check lives where it has teeth, against the production build under throttling:
 * `node tools/measure-load.mjs --check`.
 */
test('/datepicker — the inline calendar is on screen after the page has hydrated', async ({ page }) => {
    await page.goto('/datepicker');
    await page.waitForLoadState('networkidle');
    await hydrated(page);
    await expect(page.locator('.p-datepicker-select-month:visible').first()).toBeVisible();
});

/**
 * The wait every showcase spec leans on must be able to fail. With the application's scripts
 * kept from loading, the page is the server's render and nothing more: it looks complete, and
 * the markers Angular removes as it takes each view over are all still there.
 */
test('the hydration wait can fail: a page whose scripts never load is not taken over', async ({ page }) => {
    await page.route(/\.js(\?.*)?$/, (route) => route.abort());
    await page.goto('/datepicker');

    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.locator('[ngh]').count()).toBeGreaterThan(0);
    await expect(hydrated(page, 3_000)).rejects.toThrow(/never took the server-rendered page over/);
});
