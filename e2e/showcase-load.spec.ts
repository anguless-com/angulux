import { expect, test } from '@playwright/test';

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
    await expect(page.locator('.p-datepicker-select-month:visible').first()).toBeVisible();
});
