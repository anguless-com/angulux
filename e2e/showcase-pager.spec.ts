import { expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * Previous and next at the foot of a page (apps/showcase/src/components/pager.ts), in the
 * sidebar's order: the guide pages, then each group's modules.
 */

test('the links are in the prerendered HTML, in the sidebar order', async ({ request }) => {
    const html = await (await request.get('/theming')).text();

    expect(html).toMatch(/href="\/getting-started"[^>]*rel="prev"|rel="prev"[^>]*href="\/getting-started"/);
    // The first group is Form controls, and its first link by name is Checkbox.
    expect(html).toMatch(/href="\/checkbox"[^>]*rel="next"|rel="next"[^>]*href="\/checkbox"/);
});

test('the first page has no previous, the last has no next, and Next goes where it says', async ({ page }) => {
    await page.goto('/getting-started');
    await hydrated(page);

    const pager = page.getByRole('navigation', { name: 'Previous and next page' });

    await expect(pager.locator('a[rel="prev"]')).toHaveCount(0);
    await expect(pager.locator('a[rel="next"]')).toContainText('Theming');

    await pager.locator('a[rel="next"]').click();
    await expect(page).toHaveTitle('Theming — angulux');
    await expect(pager.locator('a[rel="prev"]')).toContainText('Getting started');
    await expect(pager.locator('a[rel="next"]')).toContainText('Checkbox');

    await page.goto('/utils');
    await hydrated(page);
    await expect(pager.locator('a[rel="next"]')).toHaveCount(0);
    await expect(pager.locator('a[rel="prev"]')).toHaveAttribute('href', '/usestyle');
});
