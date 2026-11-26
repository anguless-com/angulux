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
