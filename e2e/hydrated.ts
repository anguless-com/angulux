import { expect, type Page } from '@playwright/test';

/**
 * Waits until the browser's own application has taken a server-rendered showcase page over.
 *
 * The showcase is rendered on the server, so its content is visible, and `networkidle` can be
 * reached, before the client application has started. Until it has, no component stylesheet is
 * in the document and no listener is attached: a geometry read, an accessibility scan or a
 * click in that window measures a page no reader uses. On a busy machine tests do land there
 * (a release run went red on a commit that had passed three times).
 *
 * Angular removes each `ngh` marker as it takes a server-rendered view over, so none left
 * means the page a reader would use is the page under test. A page that never finishes fails
 * here by name. `e2e/showcase-load.spec.ts` proves this wait can fail.
 *
 * One exception: a subtree marked `data-hydrates-later` is server markup on purpose until a reader
 * reaches it (the preview on the home page, `apps/showcase/src/pages/home-preview.ts`), and its
 * markers stay until then. Waiting for them would wait for a hover that no test makes.
 * `e2e/home-preview.spec.ts` covers that subtree, and `hydratedLater` below waits for it.
 */
const LATER = '[data-hydrates-later]';

export async function hydrated(page: Page, timeout = 30_000): Promise<void> {
    await expect(page.locator(`[ngh]:not(${LATER}[ngh], ${LATER} [ngh])`), 'the browser never took the server-rendered page over').toHaveCount(0, {
        timeout
    });
}

/** Waits until every `data-hydrates-later` subtree on the page has been taken over too. */
export async function hydratedLater(page: Page, timeout = 30_000): Promise<void> {
    await expect(page.locator(`${LATER}[ngh], ${LATER} [ngh]`), 'a subtree marked data-hydrates-later was never taken over').toHaveCount(0, { timeout });
}
