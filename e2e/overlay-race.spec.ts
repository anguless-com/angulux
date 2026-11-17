import { expect, test } from '@playwright/test';

/**
 * A panel closed before its enter motion starts must stay closed.
 *
 * <agl-motion> waits one frame before it starts the enter motion. If the panel was told to close
 * during that frame, the motion entered anyway, and the overlay answered the enter by reporting
 * itself visible: the panel came back and stayed open, with the component believing it had been
 * shown. Measured 2026-11-18 on Select: closing one frame after opening left the panel open
 * (BL-39). A double click on the trigger is the everyday way to get there.
 *
 * Each trigger is clicked twice from inside the page, a set number of frames apart, so the timing
 * does not depend on how fast the test runner sends input. The page is apps/verify/src/overlay-race.ts.
 */

type Race = { name: string; panel: string; trigger?: string };

const CASES: Race[] = [
    { name: 'Select', trigger: '#race-select .p-select-dropdown', panel: '.p-select-overlay' },
    { name: 'DatePicker', trigger: '#race-datepicker .p-datepicker-dropdown', panel: '.p-datepicker-panel' },
    // No trigger: MultiSelect ignores a second click within 150 ms, so its own show() and hide() drive it.
    { name: 'MultiSelect', panel: '.p-multiselect-overlay' }
];

type W = { __aglMultiSelect: { show: () => void; hide: () => void } };

for (const { name, trigger, panel } of CASES) {
    test(`${name}: opened and closed again within a few frames, the panel stays closed`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto('/overlay-race');
        await expect(page.locator('#race-datepicker .p-datepicker-dropdown')).toBeVisible();

        const open = () => (trigger ? page.locator(trigger).click() : page.evaluate(() => (window as unknown as W).__aglMultiSelect.show()));
        const close = () => (trigger ? page.locator(trigger).click() : page.evaluate(() => (window as unknown as W).__aglMultiSelect.hide()));

        // Premise: it opens, and closing it well after the motion closes it.
        await open();
        await expect(page.locator(panel)).toBeVisible();
        await page.waitForTimeout(400);
        await close();
        await expect(page.locator(panel)).toBeHidden();

        const left: string[] = [];
        for (const frames of [0, 1, 2, 3, 4]) {
            await page.evaluate(
                async ({ trigger, frames }) => {
                    const el = trigger ? document.querySelector<HTMLElement>(trigger)! : null;
                    const api = (window as unknown as W).__aglMultiSelect;
                    el ? el.click() : api.show();
                    for (let i = 0; i < frames; i++) await new Promise((r) => requestAnimationFrame(r));
                    el ? el.click() : api.hide();
                },
                { trigger: trigger ?? null, frames }
            );
            // Longer than any enter or leave motion, so what is measured is where the panel came to rest.
            await page.waitForTimeout(700);
            if (await page.locator(panel).isVisible()) {
                left.push(`${frames} frame(s) apart: the panel is open`);
                // Close it for the next round.
                await page.locator('h1').click();
                await expect(page.locator(panel)).toBeHidden();
                await page.waitForTimeout(300);
            }
        }
        expect(left).toEqual([]);

        // And it still opens afterwards.
        await open();
        await expect(page.locator(panel)).toBeVisible();
        expect(errors).toEqual([]);
    });
}

test('the MultiSelect panel says where it is appended, as the Select panel does', async ({ page }) => {
    // It read `overlay-[Input Signal: undefined]`: the input was joined into the string, not read.
    await page.goto('/overlay-race');
    await page.locator('#race-select .p-select-dropdown').click();
    const selectPanel = await page.locator('.p-select-overlay').getAttribute('data-p');
    await page.locator('h1').click();
    await page.evaluate(() => (window as unknown as W).__aglMultiSelect.show());
    await expect(page.locator('.p-multiselect-overlay')).toBeVisible();
    expect(await page.locator('.p-multiselect-overlay').getAttribute('data-p')).toBe(selectPanel);
});
