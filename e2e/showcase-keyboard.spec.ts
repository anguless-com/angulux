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
