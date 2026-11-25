import { expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * Copy as Markdown on a module page (apps/showcase/src/pages/module-page.ts).
 *
 * The file it copies, `<module>.md`, is rendered from the corpus by tools/corpus/render-llms.mjs
 * and joins the site only in the Pages build (merge-showcase.mjs). The development server this
 * project runs against does not serve it, so the test serves a stand-in at that address and
 * checks what the button does with it: nothing until it is pressed, then exactly that text on
 * the clipboard.
 */

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const STAND_IN = '# datepicker\n\nThe Markdown page of the module, served by the test.\n';

test('Copy as Markdown fetches the module page only when pressed, and copies it as served', async ({ page }) => {
    const requested: string[] = [];

    await page.route('**/datepicker.md', (route) => {
        requested.push(route.request().url());

        return route.fulfill({ body: STAND_IN, contentType: 'text/markdown; charset=utf-8' });
    });

    await page.goto('/datepicker');
    await hydrated(page);

    await expect(page.getByRole('link', { name: 'datepicker.md' })).toHaveAttribute('href', 'datepicker.md');
    expect(requested, 'nothing is fetched before the button is pressed').toEqual([]);

    await page.getByRole('button', { name: 'Copy as Markdown' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Markdown copied' })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(STAND_IN);
    expect(requested).toHaveLength(1);
});

test('when the file cannot be fetched, the button says so instead of claiming a copy', async ({ page }) => {
    await page.route('**/datepicker.md', (route) => route.fulfill({ status: 404, body: '' }));

    await page.goto('/datepicker');
    await hydrated(page);
    await page.getByRole('button', { name: 'Copy as Markdown' }).click();

    await expect(page.getByRole('button', { name: 'Copy failed: open the file' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Copying failed' })).toBeAttached();
});
