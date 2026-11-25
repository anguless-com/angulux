import { expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * The sidebar's names and groups, and the browser tab's title (apps/showcase/src/nav.ts).
 *
 * The groups are the one hand-kept list on the site. The first test is what keeps them honest:
 * every module the corpus publishes has to be linked exactly once, and none may fall through to
 * "Other", so a module promoted out of the attic fails here until someone decides where it goes.
 */

interface IndexEntry {
    name: string;
}

test('every module is linked once, in a group of its own', async ({ page, request }) => {
    const index = (await (await request.get('/api/index.json')).json()) as IndexEntry[];

    expect(index.length).toBeGreaterThan(50);

    await page.goto('/');
    await hydrated(page);

    const nav = page.locator('#agl-nav');

    for (const entry of index) {
        await expect(nav.locator(`a[href="/${entry.name}"]`), `the sidebar links /${entry.name} once`).toHaveCount(1);
    }

    await expect(nav.getByText('Other', { exact: true }), 'a module is missing from NAV_GROUPS in nav.ts').toHaveCount(0);
});

test('a module is named after the class it exports, and the filter knows both names', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);

    const nav = page.locator('#agl-nav');

    await expect(nav.locator('a[href="/datepicker"]')).toContainText('DatePicker');
    await expect(nav.locator('a[href="/inputtext"]')).toContainText('InputText');
    await expect(nav.locator('a[href="/chart"]')).toContainText('Chart');
    // Declares nothing a template uses, so it keeps the name a reader imports, in monospace.
    await expect(nav.locator('a[href="/utils"] .font-mono')).toHaveText('utils');

    const filter = nav.getByRole('searchbox');

    for (const query of ['DatePick', 'datep']) {
        await filter.fill(query);
        await expect(nav.locator('a[href="/datepicker"]'), `"${query}" finds DatePicker`).toBeVisible();
        await expect(nav.locator('a[href="/table"]')).toHaveCount(0);
        await expect(nav.getByText('Form controls', { exact: true })).toBeVisible();
        await expect(nav.getByText('Data', { exact: true }), 'a group with no match keeps no heading').toHaveCount(0);
    }
});

test('the current page is marked, and its link is in sight even at the bottom of the list', async ({ page }) => {
    await page.goto('/utils');
    await hydrated(page);

    const link = page.locator('#agl-nav a[href="/utils"]');

    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(link, 'the sidebar was scrolled to the current page').toBeInViewport();
    await expect(page.locator('#agl-nav a[aria-current="page"]')).toHaveCount(1);
});

test('each page names itself in the tab, in the prerendered HTML and after a client navigation', async ({ page, request }) => {
    const html = await (await request.get('/datepicker')).text();

    expect(html, 'the server-rendered page carries the title').toContain('<title>DatePicker — angulux</title>');

    await page.goto('/datepicker');
    await hydrated(page);
    await expect(page).toHaveTitle('DatePicker — angulux');
    await expect(page.locator('h1')).toHaveText('DatePicker');

    await page.locator('#agl-nav a[href="/theming"]').click();
    await expect(page).toHaveTitle('Theming — angulux');

    await page.locator('#agl-nav a[href="/toggleswitch"]').click();
    await expect(page).toHaveTitle('ToggleSwitch — angulux');

    await page.locator('header a[href="/"]').click();
    await expect(page).toHaveTitle('angulux — documentation');
});
