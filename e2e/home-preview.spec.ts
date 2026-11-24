import { expect, test, type Page } from '@playwright/test';
import { hydrated, hydratedLater } from './hydrated';

/**
 * The preview on the home page (`apps/showcase/src/pages/home-preview.ts`) is server-rendered in
 * full and hydrated only when a pointer or focus reaches it, so that its code is not part of what
 * a phone downloads to open the page. Three things have to hold for that to be worth doing, and
 * none of them would fail a build if they stopped holding.
 *
 * What it saves is measured where it can be, against the production build under throttling:
 * `node tools/measure-load.mjs --check --only /`.
 */

const PREVIEW = 'agl-home-preview';
const LATER_MARKERS = '[data-hydrates-later][ngh], [data-hydrates-later] [ngh]';

const rowHeight = (page: Page) => page.locator(`${PREVIEW} tbody tr`).first().evaluate((row) => Math.round(row.getBoundingClientRect().height));

/** Tag, classes, role and visibility of every element in the preview, in document order. */
const shape = (page: Page) =>
    page.locator(PREVIEW).evaluate((host) =>
        [...host.querySelectorAll('*')].map((element) => {
            const classes = [...element.classList].filter((name) => !name.startsWith('ng-')).sort().join('.');
            const role = element.getAttribute('role');
            const hidden = (element as HTMLElement).hidden || getComputedStyle(element).display === 'none';
            return `${element.tagName.toLowerCase()}.${classes}${role ? `[${role}]` : ''}${hidden ? ' (hidden)' : ''}`;
        })
    );

test('the preview stays server markup until it is reached, then is taken over', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await hydrated(page);

    expect(await page.locator(LATER_MARKERS).count(), 'the preview was hydrated without being reached').toBeGreaterThan(0);

    await page.locator(PREVIEW).hover();
    await hydratedLater(page);
});

/**
 * Proven to fail: with `ngSkipHydration` on the preview's host, the component is rendered afresh
 * when its code arrives, the element that was tapped is gone, and the switch stays on Lux. (The
 * first test fails too, because a skipped subtree carries no markers.) With a mouse instead of a
 * tap, on the development server, the click survived even then, so this test taps.
 */
test('a tap made before the code arrives is not lost', async ({ browser, baseURL }) => {
    // A phone, because a phone is what the deferral is for: a tap arrives as one burst of events,
    // with the pointer reaching the button and the button going down in the same instant.
    const phone = await browser.newContext({ baseURL, hasTouch: true, isMobile: true, viewport: { width: 412, height: 823 } });
    try {
        // The height of a row in Lux, read from a page whose preview has been taken over. The
        // server markup is no reference: on the development server it can be read before its
        // stylesheets are in.
        const reference = await phone.newPage();
        await reference.goto('/');
        await reference.waitForLoadState('networkidle');
        await hydrated(reference);
        await reference.locator(PREVIEW).hover();
        await hydratedLater(reference);
        const lux = await rowHeight(reference);
        await reference.close();

        await tapBeforeCode(await phone.newPage(), lux);
    } finally {
        await phone.close();
    }
});

async function tapBeforeCode(page: Page, lux: number): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await hydrated(page);

    // Every script asked for from here on is held until the tap is over. The tap itself starts the
    // load, and on a fast server the code could otherwise arrive before the tap's click does: it
    // would then land on a live component and prove nothing.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(/\.m?js(\?.*)?$/, async (route) => {
        await held;
        await route.continue();
    });

    const compact = page.locator(PREVIEW).locator('agl-selectbutton').first().locator('[aria-pressed]', { hasText: 'Lux Compact' });
    await compact.tap();
    release();
    await hydratedLater(page);

    await expect(compact, 'the tap on Lux Compact was lost').toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => rowHeight(page), { message: 'Lux Compact was chosen but not applied' }).toBeLessThan(lux);
}

/**
 * Hydration keeps the server's DOM and attaches to it. A component that finishes its DOM in a
 * lifecycle hook can end up with a DOM that differs from the one it builds in a browser alone,
 * with no error: the inline DatePicker kept its prerendered calendar, hidden (showcase-load.spec.ts).
 * So the preview, hydrated, is compared with the preview rendered by the client after navigating
 * to the home page from another page of the site.
 */
test('hydrated, the preview is the DOM the client renders on its own', async ({ page, browser }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await hydrated(page);
    await page.locator(PREVIEW).hover();
    await hydratedLater(page);
    const fromServer = await shape(page);

    const client = await browser.newPage();
    try {
        await client.goto('/getting-started');
        await client.waitForLoadState('networkidle');
        await hydrated(client);
        await client.locator('a[href="/"]').first().click();
        await expect(client.locator(`${PREVIEW} tbody tr`)).toHaveCount(4);
        const fromClient = await shape(client);

        expect(fromServer.length).toBeGreaterThan(100);
        expect(fromServer).toEqual(fromClient);
    } finally {
        await client.close();
    }
});
