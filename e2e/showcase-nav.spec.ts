import { expect, test } from '@playwright/test';

/**
 * The showcase's slide-over navigation, below the `lg` breakpoint, from the keyboard.
 *
 * The backdrop behind the open slide-over closes it on click and is hidden from assistive
 * technology, which leaves the keyboard needing a way out of its own. Escape is that way; the
 * toggle button is the other and reports the state through aria-expanded.
 */

test.use({ viewport: { width: 700, height: 900 } });

test('showcase nav — Escape closes the slide-over and the toggle reports it', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Toggle navigation' });
    const nav = page.locator('#agl-nav');

    await expect(nav).toBeHidden();
    await toggle.click();
    await expect(nav).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('showcase nav — the backdrop is not offered to assistive technology', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Toggle navigation' }).click();

    await expect(page.locator('div[aria-hidden="true"].fixed.inset-0')).toHaveCount(1);
});
