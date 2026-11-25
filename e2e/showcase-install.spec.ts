import { expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * The install command's package-manager switch (apps/showcase/src/components/install-command.ts).
 *
 * One choice, shared by every install command on the site and kept for the next visit. The
 * server always renders pnpm, so the first test also reads the prerendered HTML.
 */

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const PACKAGES = '@anguless/angulux @anguless/angulux-themes primeicons';

test('pnpm is what the server renders, and the switch shows the command for the one picked', async ({ browser, baseURL, page }) => {
    // The server's page as it arrives, before any script runs. Its code is coloured token by
    // token, so the command is read as text rather than searched for in the markup.
    const serverOnly = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const prerendered = await serverOnly.newPage();

    await prerendered.goto('/');
    await expect(prerendered.locator('agl-install-command')).toContainText(`pnpm add ${PACKAGES}`);
    await expect(prerendered.locator('agl-install-command').getByRole('button', { name: 'pnpm' })).toHaveAttribute('aria-pressed', 'true');
    await serverOnly.close();

    await page.goto('/');
    await hydrated(page);

    const install = page.locator('agl-install-command');

    await expect(install.getByRole('button', { name: 'pnpm' })).toHaveAttribute('aria-pressed', 'true');
    await expect(install).toContainText(`pnpm add ${PACKAGES}`);

    await install.getByRole('button', { name: 'npm', exact: true }).click();

    await expect(install.getByRole('button', { name: 'npm', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(install.getByRole('button', { name: 'pnpm' })).toHaveAttribute('aria-pressed', 'false');
    await expect(install).toContainText(`npm install ${PACKAGES}`);

    await install.getByRole('button', { name: 'Copy' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`npm install ${PACKAGES}`);
});

test('the choice follows the reader to Getting started, and is still there after a reload', async ({ page }) => {
    await page.goto('/');
    await hydrated(page);
    await page.locator('agl-install-command').getByRole('button', { name: 'bun' }).click();

    await page.locator('#agl-nav a[href="/getting-started"]').click();

    const install = page.locator('agl-install-command');

    await expect(install.getByRole('button', { name: 'bun' })).toHaveAttribute('aria-pressed', 'true');
    await expect(install).toContainText(`bun add ${PACKAGES}`);

    await page.reload();
    await hydrated(page);
    await expect(install.getByRole('button', { name: 'bun' })).toHaveAttribute('aria-pressed', 'true');
    await expect(install).toContainText(`bun add ${PACKAGES}`);
});
