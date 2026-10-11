import { expect, test, type Page } from '@playwright/test';

/**
 * AutoFocus, in a browser: an `autofocus` input that nobody set asks for nothing (#184).
 *
 * Ten components forward their own `autofocus` input to the AutoFocus directive, and most of them
 * declare it `boolean | undefined` with no default. The directive removed the attribute only for
 * exactly `false`, so an application that never set the input still got `autofocus="true"` on the
 * inner field. Nothing on screen shows that attribute. What reads it is Popover, which focuses the
 * first `[autofocus]` it finds when it opens, so the stray attribute decides where the keyboard
 * lands. The scenarios assert on the attribute, then open each popover with a real click and
 * assert on where focus went.
 */

function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    return errors;
}

test('autofocus — a component whose autofocus input is unset carries no autofocus attribute', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.locator('#sec-autofocus').scrollIntoViewIfNeeded();

    const combobox = page.locator('#af-select [role="combobox"]');
    const button = page.locator('#af-button button');

    // Visible first, so the absence below is measured on a rendered field and not on nothing.
    await expect(combobox).toBeVisible();
    await expect(button).toBeVisible();
    await expect(combobox).not.toHaveAttribute('autofocus');
    await expect(button).not.toHaveAttribute('autofocus');

    expect(errors).toEqual([]);
});

test('autofocus — a popover focuses the field the app marked, not a component that asked for nothing', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.locator('#sec-autofocus').scrollIntoViewIfNeeded();

    // The select comes BEFORE the marked field, which is the order that lets a stray attribute win.
    await page.locator('#af-ask-open button').click();
    await expect(page.locator('#af-ask-name')).toBeFocused();
    await expect(page.locator('#af-ask-select [role="combobox"]')).not.toBeFocused();

    expect(errors).toEqual([]);
});

test('autofocus — a popover with nothing marked focuses its first button, as Popover documents', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.locator('#sec-autofocus').scrollIntoViewIfNeeded();

    await page.locator('#af-plain-open button').click();
    await expect(page.locator('#af-plain-save button')).toBeFocused();

    expect(errors).toEqual([]);
});
