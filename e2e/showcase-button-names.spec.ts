import { expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * A button with an icon and a label is named by its label alone.
 *
 * PrimeIcons draws each glyph in ::before as a private-use character, and generated content takes
 * part in the accessible name. While the icon was not hidden from assistive technology, "Profile"
 * was announced as "<glyph> Profile", and a voice-control user saying "Profile" did not match it.
 */

test('the icon beside a label stays out of the button name, in every icon position', async ({ page }) => {
    await page.goto('/button');
    await hydrated(page);

    const buttons = page.locator('agl-button-icons-doc').getByRole('button');
    // Home is icon-only and named by its ariaLabel; the other four put the icon left, right, top
    // and bottom of the label.
    const names = ['Home', 'Profile', 'Save', 'Search', 'Update'];

    await expect(buttons).toHaveCount(names.length);
    for (const [i, name] of names.entries()) {
        await expect(buttons.nth(i), `button ${i + 1}`).toHaveAccessibleName(name);
    }
});

test('a ToggleButton is named by its label, not by its on or off icon', async ({ page }) => {
    await page.goto('/togglebutton');
    await hydrated(page);

    // onLabel="Locked" offLabel="Unlocked" onIcon="pi pi-lock" offIcon="pi pi-lock-open"
    const toggle = page.locator('agl-togglebutton-icons-doc').getByRole('button');

    await expect(toggle).toHaveAccessibleName('Unlocked');
    await toggle.click();
    await expect(toggle).toHaveAccessibleName('Locked');
});

test('the icon an app marks with aglButtonIcon stays out of the button name', async ({ page }) => {
    await page.goto('/button');
    await hydrated(page);

    // <button aglButton><i class="pi pi-check" aglButtonIcon></i><span aglButtonLabel>Save</span></button>
    await expect(page.locator('agl-button-directive-doc').getByRole('button')).toHaveAccessibleName('Save');
});

test("FileUpload's Choose button is named by its label, not by its icon", async ({ page }) => {
    await page.goto('/fileupload');
    await hydrated(page);

    // Not a glyph this time: the icon carried aria-label="true", and the button was "true Choose".
    await expect(page.locator('agl-fileupload-advanced-doc').getByRole('button', { name: /Choose/ })).toHaveAccessibleName('Choose');
});
