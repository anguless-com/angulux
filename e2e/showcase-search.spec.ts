import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * Search (apps/showcase/src/search/). It must cost a page nothing until it is opened, find
 * modules and API members by name, take the reader to the heading that documents them, and
 * behave as a modal dialog: Escape closes it and focus goes back where it was.
 */

test('nothing of search is downloaded until it is opened', async ({ page }) => {
    const fetched: string[] = [];

    page.on('request', (request) => {
        if (request.url().includes('search.json')) fetched.push(request.url());
    });

    await page.goto('/');
    await hydrated(page);
    await page.waitForLoadState('networkidle');
    expect(fetched, 'the index is not fetched with the page').toEqual([]);

    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('dialog', { name: 'Search the documentation' })).toBeVisible();
    await expect.poll(() => fetched.length).toBe(1);
});

test('the shortcut opens it, a module is found by part of its name, and Enter goes there', async ({ page }) => {
    await page.goto('/theming');
    await hydrated(page);

    await page.keyboard.press('ControlOrMeta+k');

    const field = page.getByRole('combobox', { name: 'Search' });

    await expect(field).toBeFocused();
    // "date" is also the exact name of DatePicker's date slot; the module still comes first.
    await field.fill('date');

    const first = page.getByRole('option').first();

    await expect(first).toContainText('Module');
    await expect(first).toContainText('DatePicker');
    await expect(first).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/datepicker$/);
    await expect(page).toHaveTitle('DatePicker — angulux');
    await expect(page.getByRole('dialog')).toBeHidden();
});

test('an input is found by name and leads to the heading of the declaration that has it', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('combobox', { name: 'Search' }).fill('showButtonBar');

    const first = page.getByRole('option').first();

    await expect(first).toContainText('showButtonBar');
    await expect(first).toContainText('Input');
    await expect(first).toContainText('DatePicker');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/datepicker#api-DatePicker$/);
    await expect(page.locator('#api-DatePicker'), 'the page scrolled to the heading once it had loaded').toBeInViewport();
});

test('a selector finds the module it belongs to', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('combobox', { name: 'Search' }).fill('agl-select');

    const first = page.getByRole('option').first();

    await expect(first).toContainText('Module');
    await expect(first).toContainText('Select');
    await expect(first).not.toContainText('SelectButton');
});

test('the arrow keys move the highlighted result, and Escape closes and gives focus back', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);

    const button = page.getByRole('button', { name: 'Search' });

    await button.click();

    const field = page.getByRole('combobox', { name: 'Search' });

    await field.fill('select');
    await expect(field).toHaveAttribute('aria-activedescendant', 'agl-search-option-0');
    await page.keyboard.press('ArrowDown');
    await expect(field).toHaveAttribute('aria-activedescendant', 'agl-search-option-1');
    await expect(page.locator('#agl-search-option-1')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(button).toBeFocused();

    // A phone has no Escape key: the close button does the same.
    await button.click();
    await page.getByRole('button', { name: 'Close search' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(button).toBeFocused();
});

test('the open dialog, with results, has no accessibility violation', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('combobox', { name: 'Search' }).fill('button');
    await expect(page.getByRole('option').first()).toBeVisible();

    const result = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();

    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
