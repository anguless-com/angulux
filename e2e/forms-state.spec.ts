import { expect, test, type Page } from '@playwright/test';

/**
 * Reactive Forms state, in a browser, on the attributes a screen reader reads.
 *
 * `reactive-forms.spec.ts` asks every form control the same questions in the unit suite, with
 * each change made in code. This asks three of them what a user's keyboard asks, against the
 * verification app: section 16 binds a required select, text input and password through
 * `formControlName`, with nothing bound to `[invalid]` or `[required]`.
 *
 * The rule every scenario follows here too: interact for real, then assert. A required control
 * that is announced as required and not yet as invalid is correct on the first render even when
 * nothing is wired, so the assertions that carry the weight are the ones after the Tab key and
 * after typing.
 */

const EVIDENCE = 'test-results/evidence';

function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    return errors;
}

test('forms — a required control bound through Reactive Forms is announced as required, as invalid once left empty, and clears on a value', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');

    const section = page.locator('#sec-forms');
    const city = page.locator('#rf-city');
    const combobox = city.locator('[role="combobox"]');
    const name = page.locator('#rf-name');
    const secret = page.locator('#rf-secret-input');
    await section.scrollIntoViewIfNeeded();

    // Announced as required from the first render, and not yet as invalid: nobody has been here.
    await expect(combobox).toHaveAttribute('aria-required', 'true');
    await expect(name).toHaveAttribute('aria-required', 'true');
    await expect(secret).toHaveAttribute('required', '');
    for (const focusable of [combobox, name, secret]) await expect(focusable).not.toHaveAttribute('aria-invalid');

    // Leave each one empty with the keyboard.
    await combobox.focus();
    await page.keyboard.press('Tab');
    await name.focus();
    await page.keyboard.press('Tab');
    await secret.focus();
    await page.keyboard.press('Tab');

    await expect(combobox).toHaveAttribute('aria-invalid', 'true');
    await expect(city).toHaveClass(/p-invalid/);
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveClass(/p-invalid/);
    await expect(secret).toHaveAttribute('aria-invalid', 'true');
    await expect(secret).toHaveClass(/p-invalid/);
    await section.screenshot({ path: `${EVIDENCE}/forms-invalid-after-tab.png` });

    // A value clears the state; the requirement stays.
    await name.fill('Ada');
    await secret.fill('correct horse');
    await city.click();
    const option = page.locator('.p-select-option', { hasText: 'Hanoi' });
    await expect(option).toBeVisible();
    await option.click();

    for (const focusable of [combobox, name, secret]) await expect(focusable).not.toHaveAttribute('aria-invalid');
    await expect(city).not.toHaveClass(/p-invalid/);
    await expect(name).toHaveAttribute('aria-required', 'true');
    await section.screenshot({ path: `${EVIDENCE}/forms-cleared.png` });

    expect(errors).toEqual([]);
});
