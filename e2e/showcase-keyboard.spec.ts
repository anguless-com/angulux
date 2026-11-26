import { expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * Overlays driven from the keyboard on the showcase: when one closes, focus goes back to the control
 * that opened it.
 *
 * A keyboard user who opens a menu and closes it again expects to carry on from where they were.
 * When focus is dropped instead, it lands on the page body and the next Tab starts from the top of
 * the page (WCAG 2.4.3, Focus Order; the WAI-ARIA menu button and dialog patterns both return focus
 * to the opener).
 *
 * The other way round, too: an overlay that a click opens again once it has been closed opens again
 * from the keyboard (WCAG 2.1.1, Keyboard).
 */

test('SplitButton: closing its menu from the keyboard puts focus back on the dropdown button', async ({ page }) => {
    await page.goto('/splitbutton');
    await hydrated(page);

    const dropdown = page.locator('agl-splitbutton-basic-doc').getByRole('button', { name: 'More actions' });
    const menu = page.getByRole('menu');

    // Escape.
    await dropdown.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(dropdown).toBeFocused();

    // An item chosen with Enter.
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(dropdown).toBeFocused();
});

test('Dialog: closing it puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/dialog');
    await hydrated(page);

    const show = page.locator('agl-dialog-basic-doc').getByRole('button', { name: 'Show' });
    const dialog = page.getByRole('dialog');

    await show.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(show).toBeFocused();
});

test('Dialog, modal: closing it, by Escape or by its Cancel button, puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/dialog');
    await hydrated(page);

    const show = page.locator('agl-dialog-modal-doc').getByRole('button', { name: 'Show modal' });
    const dialog = page.getByRole('dialog');

    // Escape.
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(show).toBeFocused();

    // Cancel, which has focus when the dialog opens.
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(show).toBeFocused();
});

test('Drawer: closing it, by Escape or by its close button, puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/drawer');
    await hydrated(page);

    const open = page.locator('agl-drawer-basic-doc').getByRole('button', { name: 'Open' });
    const drawer = page.getByRole('dialog');

    // Escape.
    await open.focus();
    await page.keyboard.press('Enter');
    await expect(drawer.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(open).toBeFocused();

    // The close button, which has focus when the drawer opens.
    await page.keyboard.press('Enter');
    await expect(drawer.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(drawer).toBeHidden();
    await expect(open).toBeFocused();
});

test('ConfirmDialog: answering or dismissing it puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/confirmdialog');
    await hydrated(page);

    const del = page.locator('agl-confirmdialog-basic-doc').getByRole('button', { name: 'Delete' });
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));

    // Escape.
    await del.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'No' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(del).toBeFocused();

    // No, which has focus when the dialog opens.
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'No' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(del).toBeFocused();
});

test('DatePicker: once Escape has closed it, ArrowDown or Alt+ArrowDown opens it again', async ({ page }) => {
    await page.goto('/datepicker');
    await hydrated(page);

    const input = page.locator('agl-datepicker-basic-doc').getByRole('combobox', { name: 'Date' });
    const panel = page.getByRole('dialog', { name: 'Choose Date' });

    // Focus opens it; Escape closes it and leaves focus on the input. A click opens it again from
    // here, and until now no key did: the keyboard had to leave the input and come back.
    await input.focus();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(panel).toBeVisible();
    await expect(input).toBeFocused();

    // With it open, ArrowDown goes on into the calendar, as it did when focus opened it.
    await page.keyboard.press('ArrowDown');
    await expect(panel.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(panel).toBeVisible();
    await expect(input).toBeFocused();
});

test('ColorPicker: Space opens it, and Escape, Space or Tab closes it', async ({ page }) => {
    await page.goto('/colorpicker');
    await hydrated(page);

    const input = page.locator('agl-colorpicker-basic-doc').getByRole('textbox');
    // The inline demo's panel is on screen all the time, so only the popup one is counted. A sweep
    // that counted both once reported this picker as one that no key closes.
    const panel = page.locator('.p-colorpicker-panel:not(agl-colorpicker-inline-doc *)');

    // Escape, with focus left on the input.
    await input.focus();
    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();

    // Space again.
    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Space');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();

    // Tab, which moves on.
    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(panel).toBeHidden();
    await expect(input).not.toBeFocused();
});

test('Select: Enter, Space, ArrowDown and Alt+ArrowDown open it, the arrows move the active option, Enter chooses, Escape closes', async ({ page }) => {
    await page.goto('/select');
    await hydrated(page);

    const combobox = page.locator('agl-select-basic-doc [role="combobox"]');
    const panel = page.locator('.p-select-overlay');
    await expect(panel).toHaveCount(0);

    // Each key opens it; Escape closes it; focus never leaves the combobox.
    await combobox.focus();
    for (const key of ['Enter', 'Space', 'ArrowDown', 'Alt+ArrowDown']) {
        await page.keyboard.press(key);
        await expect(panel, `${key} opens it`).toBeVisible();
        await expect(combobox).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(panel, `Escape closes it after ${key}`).toBeHidden();
        await expect(combobox).toBeFocused();
    }

    // The arrows move the active option, which the combobox names; Enter chooses it and closes.
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    const before = await combobox.getAttribute('aria-activedescendant');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => combobox.getAttribute('aria-activedescendant'), 'ArrowDown moves the active option').not.toBe(before);
    const activeId = await combobox.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    const chosen = (await page.locator(`[id="${activeId}"]`).textContent())?.trim() ?? '';
    expect(chosen).not.toBe('');
    await page.keyboard.press('Enter');
    await expect(panel).toBeHidden();
    await expect(combobox).toBeFocused();
    await expect(combobox).toHaveText(chosen);
});

test('MultiSelect: Enter opens it and Escape closes it, with focus back on the combobox', async ({ page }) => {
    await page.goto('/multiselect');
    await hydrated(page);

    // Only opening, closing and where focus ends up. What each option exposes is not checked here:
    // its nested checkbox is an open question (see the MultiSelect case in showcase-open-overlays).
    const combobox = page.locator('agl-multiselect-basic-doc [role="combobox"]');
    const panel = page.locator('.p-multiselect-overlay');
    await expect(panel).toHaveCount(0);

    await combobox.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(combobox).toBeFocused();
});

test('Menu popup: focus moves into it, and Escape or an item chosen with Enter puts it back on the button', async ({ page }) => {
    await page.goto('/menu');
    await hydrated(page);

    const show = page.locator('agl-menu-popup-doc').getByRole('button', { name: 'Show' });
    // The page also shows an inline menu, which is a role="menu" list all the time.
    const menu = page.locator('.p-menu-overlay [role="menu"]');
    await expect(menu).toHaveCount(0);

    // Escape.
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(show).toBeFocused();

    // An item chosen with Enter.
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(show).toBeFocused();
});

test('Popover: Escape closes it, with focus still on the button that opened it', async ({ page }) => {
    await page.goto('/popover');
    await hydrated(page);

    const show = page.locator('agl-popover-basic-doc').getByRole('button', { name: 'Show' });
    const panel = page.locator('.p-popover');
    await expect(panel).toHaveCount(0);

    await show.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(show).toBeFocused();
});

test('Dialog, modal: Tab and Shift+Tab keep focus inside it', async ({ page }) => {
    await page.goto('/dialog');
    await hydrated(page);

    const show = page.locator('agl-dialog-modal-doc').getByRole('button', { name: 'Show modal' });
    const dialog = page.getByRole('dialog');

    await show.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    // Twelve presses each way go round the dialog's three buttons several times.
    for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 1; i <= 12; i++) {
            await page.keyboard.press(key);
            await expect(dialog.locator(':focus'), `${key} ×${i} keeps focus inside`).toHaveCount(1);
        }
    }
});

test('TieredMenu popup: closing it from the keyboard puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/tieredmenu');
    await hydrated(page);

    const show = page.locator('agl-tieredmenu-popup-doc').getByRole('button', { name: 'Show' });
    // The root list; a submenu is a second list inside it.
    const menu = page.locator('.p-tieredmenu-overlay [role="menu"]').first();

    // Escape.
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(show).toBeFocused();

    // File > Open, chosen with Enter.
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('menuitem', { name: 'Open' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(show).toBeFocused();
});
