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
