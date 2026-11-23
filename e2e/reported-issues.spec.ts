import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Defects reported against a published version, measured in Chrome.
 *
 * Each test asserts the behaviour that is right, so the defect turns it red, and names the issue
 * it measures. The page is apps/verify/src/reported.ts, one scene per `?case=`.
 *
 * MEASURED 2026-11-23 on 22.6.13, before the fixes: every test marked (#258), (#256) or (#257)
 * below was red. The ones named "control" were green then and hold what must not change.
 */

function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    return errors;
}

async function open(page: Page, kase: string): Promise<void> {
    await page.goto(`/reported?case=${kase}`);
    await expect(page.locator(`#sec-${kase}`)).toBeVisible();
}

// ─── Checkbox (#258) ─────────────────────────────────────────────────────────────────────────

test('checkbox (#258) — an indeterminate checkbox is reported as mixed, and as checked once it is clicked', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'checkbox-mixed');
    const mixed = page.locator('#cm-mixed');

    // The minus icon is what a sighted user gets; the input has to say the same thing.
    await expect(page.locator('agl-checkbox:has(#cm-mixed) [data-p-icon="minus"]')).toBeVisible();
    expect(await mixed.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
    await expect(page.locator('#sec-checkbox-mixed')).toMatchAriaSnapshot(`
      - checkbox "Select page" [checked=mixed]
      - checkbox "Plain, off"
      - checkbox "Plain, on" [checked]
      - checkbox "Read-only, mixed" [checked=mixed]
    `);

    // The input bound to the mixed state follows it both ways.
    const isMixed = () => mixed.evaluate((el: HTMLInputElement) => el.indeterminate);
    await page.locator('#cm-clear-mixed').click();
    await expect.poll(isMixed).toBe(false);
    await page.locator('#cm-set-mixed').click();
    await expect.poll(isMixed).toBe(true);

    // A click resolves the mixed state to checked.
    await mixed.click({ force: true });
    await expect(mixed).toBeChecked();
    await expect.poll(isMixed).toBe(false);
    await expect(page.locator('agl-checkbox:has(#cm-mixed) [data-p-icon="minus"]')).toHaveCount(0);

    // A read-only box stays mixed when it is clicked: the icon stays, so the input must too.
    const readonly = page.locator('#cm-readonly');
    await readonly.click({ force: true });
    await expect(page.locator('agl-checkbox:has(#cm-readonly) [data-p-icon="minus"]')).toBeVisible();
    await expect.poll(() => readonly.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
    expect(errors).toEqual([]);
});

test('checkbox, control — a checkbox that is not indeterminate is never reported as mixed', async ({ page }) => {
    await open(page, 'checkbox-mixed');
    for (const id of ['#cm-off', '#cm-on']) {
        expect(await page.locator(id).evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(false);
    }
    await page.locator('#cm-off').click({ force: true });
    await expect(page.locator('#cm-off')).toBeChecked();
    expect(await page.locator('#cm-off').evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(false);
});

// ─── Select (#256) ───────────────────────────────────────────────────────────────────────────

const selectHost = (page: Page, inputId: string): Locator => page.locator(`agl-select:has(#${inputId})`);
const selectOverlay = (page: Page): Locator => page.locator('.p-select-overlay');
const selectFilter = (page: Page): Locator => selectOverlay(page).locator('input[role="searchbox"]');
const selectOptions = (page: Page): Locator => selectOverlay(page).locator('li[role="option"]:not(.p-select-empty-message)');

test('select (#256) — keys pressed in the same task as the click all reach the filter box', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'select-filter-keys');

    // Click and three keys inside one task: no frame passes, so the panel is not rendered and
    // focus is still on the trigger when the keys arrive. This is the worst case of "click and
    // type in one motion", and it does not depend on how fast the test runner sends input.
    await page.evaluate(() => {
        const trigger = document.getElementById('sf-filter')!;
        trigger.closest('agl-select')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        for (const key of 'abc') {
            trigger.dispatchEvent(new KeyboardEvent('keydown', { key, code: `Key${key.toUpperCase()}`, bubbles: true, cancelable: true }));
        }
    });
    await expect(selectOverlay(page)).toBeVisible();
    await expect(selectFilter(page)).toHaveValue('abc');
    await expect(selectFilter(page)).toBeFocused();
    await expect(selectOptions(page)).toHaveText(['abcde']);

    // What is typed next goes on at the end.
    await page.keyboard.type('d');
    await expect(selectFilter(page)).toHaveValue('abcd');
    expect(errors).toEqual([]);
});

test('select (#256) — real keystrokes sent right after the click all reach the filter box', async ({ page }) => {
    await open(page, 'select-filter-keys');
    await selectHost(page, 'sf-filter').click();
    await page.keyboard.type('abc');
    await expect(selectFilter(page)).toHaveValue('abc');
    await expect(selectOptions(page)).toHaveText(['abcde']);
});

test('select, control — a key on a closed Select with the filter on still opens it by type-ahead', async ({ page }) => {
    // Only keys pressed while the panel is opening are on their way to the filter box.
    await open(page, 'select-filter-keys');
    await page.locator('#sf-filter').focus();
    await page.keyboard.press('c');
    await expect(selectOverlay(page)).toBeVisible();
    await expect(selectOverlay(page).locator('li[role="option"].p-focus')).toHaveText('cedar');
    await expect(selectFilter(page)).toHaveValue('');
});

test('select, control — without a filter, and with a filter that does not take focus, a key still moves to the matching option', async ({ page }) => {
    await open(page, 'select-filter-keys');

    await page.locator('#sf-plain').focus();
    await page.keyboard.type('c');
    await expect(selectOverlay(page)).toBeVisible();
    await expect(selectOverlay(page).locator('li[role="option"].p-focus')).toHaveText('cedar');
    await page.keyboard.press('Escape');
    await expect(selectOverlay(page)).toBeHidden();

    await page.locator('#sf-nofocus').focus();
    await page.keyboard.type('c');
    await expect(selectOverlay(page)).toBeVisible();
    await expect(selectOverlay(page).locator('li[role="option"].p-focus')).toHaveText('cedar');
    await expect(selectFilter(page)).toHaveValue('');
});

// ─── Drawer (#257) ───────────────────────────────────────────────────────────────────────────

const PHONE = { width: 390, height: 844 };
const drawerIn = (page: Page, id: string): Locator => page.locator(`#${id} .p-drawer`);
const drawerMask = (page: Page): Locator => page.locator('.p-drawer-mask');

/** Open a drawer and wait until its enter animation is over. */
async function openDrawer(page: Page, opener: string, id: string): Promise<Locator> {
    await page.locator(opener).click();
    const drawer = drawerIn(page, id);
    await expect(drawer).toBeVisible();
    await expect(drawer).not.toHaveClass(/p-drawer-enter-/);
    return drawer;
}

test('drawer (#257, 1) — Escape closes the dialog on top and leaves the drawer and its mask; the next Escape closes the drawer', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(PHONE);
    await open(page, 'drawer-sheet');
    const drawer = await openDrawer(page, '#ds-open', 'ds-sheet');
    await expect(drawerMask(page)).toHaveCount(1);

    await page.locator('#ds-open-dialog').click();
    const dialog = page.locator('#ds-dialog .p-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#ds-dialog-ok')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // Longer than the drawer's leave animation: what is measured is where things came to rest.
    await page.waitForTimeout(800);
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('data-p-open', 'true');
    await expect(drawerMask(page)).toHaveCount(1);

    await page.locator('#ds-field').focus();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(drawerMask(page)).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('drawer (#257, 1) — with closeOnEscape off, Escape leaves the drawer and its mask alone', async ({ page }) => {
    await open(page, 'drawer-sheet');
    const drawer = await openDrawer(page, '#ds-open-pinned', 'ds-pinned');
    await expect(drawerMask(page)).toHaveCount(1);
    await page.locator('#ds-pinned-button').focus();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    await expect(drawer).toBeVisible();
    await expect(drawerMask(page)).toHaveCount(1);
});

test('drawer (#257, 1) — with autoZIndex off, Escape still closes the drawer', async ({ page }) => {
    // Found while measuring #257: the old test compared NaN with 0 here, so Escape never closed it.
    await open(page, 'drawer-sheet');
    const drawer = await openDrawer(page, '#ds-open-flat', 'ds-flat');
    await page.locator('#ds-flat-button').focus();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(drawerMask(page)).toHaveCount(0);
});

test('drawer (#257, 2) — an open drawer has no transform at rest, so a dialog inside it covers the viewport', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'drawer-sheet');
    const drawer = await openDrawer(page, '#ds-open', 'ds-sheet');
    expect(await drawer.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    // It still sits at the bottom edge, full width.
    const box = (await drawer.boundingBox())!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(PHONE.width);
    expect(Math.round(box.y + box.height)).toBe(PHONE.height);

    await page.locator('#ds-open-dialog').click();
    await expect(page.locator('#ds-dialog .p-dialog')).toBeVisible();
    const mask = (await page.locator('.p-dialog-mask').boundingBox())!;
    expect({ x: Math.round(mask.x), y: Math.round(mask.y), width: Math.round(mask.width), height: Math.round(mask.height) }).toEqual({ x: 0, y: 0, ...PHONE });
});

test('drawer, control — the drawer still slides in from its edge and out again', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'drawer-sheet');
    await page.locator('#ds-open').click();
    const drawer = drawerIn(page, 'ds-sheet');
    await expect(drawer).toBeVisible();
    // Part-way through the enter animation the panel is still moving up: its top edge is below
    // where it comes to rest.
    const during = (await drawer.boundingBox())!.y;
    await expect(drawer).not.toHaveClass(/p-drawer-enter-/);
    const rest = (await drawer.boundingBox())!.y;
    expect(during).toBeGreaterThan(rest);

    await page.locator('#ds-field').focus();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveClass(/p-drawer-leave-bottom/);
    await expect(drawer).toBeHidden();
});

test('drawer (#257, 3) — focus moves into a modal drawer when it opens', async ({ page }) => {
    await open(page, 'drawer-sheet');
    await page.locator('#ds-open').focus();
    await page.keyboard.press('Enter');
    await expect(drawerIn(page, 'ds-sheet')).toBeVisible();
    // The first control of the content, ahead of the close button in the header.
    await expect(page.locator('#ds-field')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawerIn(page, 'ds-sheet')).toBeHidden();

    // With nothing to focus in the content, the close button takes it.
    await page.locator('#ds-open-bare').focus();
    await page.keyboard.press('Enter');
    await expect(drawerIn(page, 'ds-bare')).toBeVisible();
    await expect(drawerIn(page, 'ds-bare').locator('.p-drawer-close-button button')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawerIn(page, 'ds-bare')).toBeHidden();

    // With no control at all, the drawer itself takes it.
    await page.locator('#ds-open-empty').focus();
    await page.keyboard.press('Enter');
    await expect(drawerIn(page, 'ds-empty')).toBeVisible();
    await expect(drawerIn(page, 'ds-empty')).toBeFocused();
});

test('drawer (#257, 4) — a modal drawer is a dialog named by its header, and its close button has a name', async ({ page }) => {
    await open(page, 'drawer-sheet');
    const drawer = await openDrawer(page, '#ds-open', 'ds-sheet');
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer).toHaveAccessibleName('Filters');
    await expect(drawer.getByRole('button', { name: 'Close' })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    // No header text: still a dialog, and no reference to a title that is not there.
    const bare = await openDrawer(page, '#ds-open-bare', 'ds-bare');
    await expect(bare).toHaveAttribute('role', 'dialog');
    expect(await bare.getAttribute('aria-labelledby')).toBeNull();
    await expect(bare.getByRole('button', { name: 'Close' })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(bare).toBeHidden();

    // A drawer that is not modal keeps its role and is named by its header too.
    const side = await openDrawer(page, '#ds-open-side', 'ds-side');
    await expect(side).toHaveAttribute('role', 'complementary');
    await expect(side).toHaveAccessibleName('Side');
});

test('drawer, control — a role and a name the app gives through pt stay in charge', async ({ page }) => {
    await open(page, 'drawer-sheet');
    const custom = await openDrawer(page, '#ds-open-custom', 'ds-custom');
    await expect(custom).toHaveAttribute('role', 'region');
    await expect(custom).toHaveAccessibleName('Custom name');
});

test('drawer, control — a drawer that is not modal stays a complementary region and does not take focus', async ({ page }) => {
    await open(page, 'drawer-sheet');
    await page.locator('#ds-open-side').focus();
    await page.keyboard.press('Enter');
    const side = drawerIn(page, 'ds-side');
    await expect(side).toBeVisible();
    await expect(side).not.toHaveClass(/p-drawer-enter-/);
    await expect(side).toHaveAttribute('role', 'complementary');
    expect(await side.getAttribute('aria-modal')).toBeNull();
    await expect(drawerMask(page)).toHaveCount(0);
    await expect(page.locator('#ds-open-side')).toBeFocused();
    // Escape still closes it.
    await page.keyboard.press('Escape');
    await expect(side).toBeHidden();
});

// ─── Drawer, Escape under a toast or a tooltip (found on 22.6.14) ────────────────────────────────
// 22.6.14 let Escape close a drawer only when nothing at all held a higher z-index. A toast or a
// tooltip holds one, so a drawer under either stopped answering Escape. A dialog that is on its
// way out holds one as well until its leave animation ends, so the second of two quick Escapes
// was lost. MEASURED 2026-11-23 on 22.6.14: the three tests below were red.

test('drawer — a toast shown over the drawer does not keep Escape from closing it', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'drawer-layers');
    const drawer = await openDrawer(page, '#dl-open', 'dl-drawer');

    await page.locator('#dl-toast').click();
    await expect(page.locator('.p-toast-message')).toBeVisible();

    await page.locator('#dl-toast').focus();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(drawerMask(page)).toHaveCount(0);
    await expect(page.locator('.p-toast-message')).toBeVisible();
    expect(errors).toEqual([]);
});

test('drawer — a dialog beside the drawer closes first, and with a tooltip showing the next Escape still closes the drawer', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'drawer-layers');
    const drawer = await openDrawer(page, '#dl-open', 'dl-drawer');

    // The pointer stays on the button, so its tooltip is showing again once the dialog has gone.
    await page.locator('#dl-open-dialog').click();
    const dialog = page.locator('#dl-dialog .p-dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.waitForTimeout(800);
    await expect(drawer).toBeVisible();

    await page.locator('#dl-open-dialog').hover();
    await expect(page.locator('.p-tooltip')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(drawerMask(page)).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('drawer — two Escapes in a row close the dialog and then the drawer, without waiting for the dialog to finish leaving', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'drawer-layers');
    const drawer = await openDrawer(page, '#dl-open', 'dl-drawer');

    await page.locator('#dl-open-dialog').click();
    const dialog = page.locator('#dl-dialog .p-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toHaveAttribute('data-phase', /.*/);

    await page.keyboard.press('Escape');
    // The dialog is still animating out here: that is the moment being measured.
    await expect(dialog).toHaveAttribute('data-phase', 'leave');
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(drawer).toBeHidden();
    await expect(drawerMask(page)).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('dialog — Escape closes a dialog while a toast is on screen', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dialog-layers');
    await page.locator('#gl-open').click();
    const dialog = page.locator('#gl-dialog .p-dialog');
    await expect(dialog).toBeVisible();

    await page.locator('#gl-toast').click();
    await expect(page.locator('.p-toast-message')).toBeVisible();

    await page.locator('#gl-toast').focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('.p-toast-message')).toBeVisible();
    expect(errors).toEqual([]);
});

test('dialog — Escape closes a dialog while a tooltip is showing', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dialog-layers');
    await page.locator('#gl-open').click();
    const dialog = page.locator('#gl-dialog .p-dialog');
    await expect(dialog).toBeVisible();

    await page.locator('#gl-toast').hover();
    await expect(page.locator('.p-tooltip')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
});

test('dialog — Escape with a list open over the dialog closes the list and leaves the dialog', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dialog-layers');
    await page.locator('#gl-open').click();
    const dialog = page.locator('#gl-dialog .p-dialog');
    await expect(dialog).toBeVisible();

    // The dialog takes focus once it has entered; a click before that loses it again.
    await expect(page.locator('#gl-toast')).toBeFocused();
    await page.locator('#gl-dialog .p-select').click();
    const list = page.locator('.p-select-overlay');
    await expect(list).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await page.waitForTimeout(500);
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
});

test('drawer — Escape with a list open over the drawer closes the list and leaves the drawer', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'drawer-layers');
    const drawer = await openDrawer(page, '#dl-open', 'dl-drawer');

    await page.locator('#dl-drawer .p-select').click();
    const list = page.locator('.p-select-overlay');
    await expect(list).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await page.waitForTimeout(500);
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    expect(errors).toEqual([]);
});

// ─── Popover arrow ───────────────────────────────────────────────────────────────────────────

/**
 * Where the arrow's tip is, and where the trigger is. The arrow is two pseudo-elements with a
 * zero box and borders, so the tip sits at the pseudo-element's `left` inside the panel's border.
 */
async function arrowAndTrigger(page: Page, trigger: string): Promise<{ tip: number; left: number; centre: number }> {
    await page.locator(trigger).click();
    await expect(page.locator('#pa-panel')).toBeVisible();
    // The panel scales in; its box is only where it will stay once that has ended.
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#pa-panel')!.closest('.p-popover')!).transform)).toBe('none');
    const measured = await page.evaluate((trigger) => {
        const panel = document.querySelector('#pa-panel')!.closest('.p-popover') as HTMLElement;
        const box = panel.getBoundingClientRect();
        const target = document.querySelector(trigger)!.getBoundingClientRect();
        const tip = box.left + panel.clientLeft + parseFloat(getComputedStyle(panel, '::before').left);
        return { tip, left: target.left, centre: target.left + target.width / 2 };
    }, trigger);
    await page.keyboard.press('Escape');
    await expect(page.locator('#pa-panel')).toBeHidden();
    return measured;
}

test('popover — the arrow points at the middle of a trigger narrower than the arrow is inset, at the left edge of the panel or slid away from it', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'popover-arrow');

    const narrow = await arrowAndTrigger(page, '#pa-narrow');
    expect(Math.abs(narrow.tip - narrow.centre), 'narrow trigger').toBeLessThanOrEqual(1);

    const edge = await arrowAndTrigger(page, '#pa-edge');
    expect(Math.abs(edge.tip - edge.centre), 'trigger at the right edge').toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
});

test('popover — under a wide trigger the arrow keeps its inset from the trigger\'s left edge, and keeps the same one when the panel slides left', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'popover-arrow');

    const wide = await arrowAndTrigger(page, '#pa-wide');
    const inset = wide.tip - wide.left;
    expect(inset, 'inset under a wide trigger').toBeGreaterThan(8);
    expect(inset).toBeLessThan(100);

    const edge = await arrowAndTrigger(page, '#pa-edge-wide');
    expect(Math.abs(edge.tip - edge.left - inset), 'the same inset at the right edge').toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
});
