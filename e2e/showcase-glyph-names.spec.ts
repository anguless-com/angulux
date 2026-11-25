import { expect, test } from '@playwright/test';
import { glyphNames } from './glyph-names';
import { hydrated } from './hydrated';
import { showcasePages } from './showcase-pages';

/**
 * No accessible name on any showcase page carries an icon font's glyph.
 *
 * Button, ToggleButton and the site's own icons each leaked a PrimeIcons glyph into names
 * ("<glyph> Copy" was on every page) until their icons were marked aria-hidden. axe does not
 * report it: the name is not empty, and it still contains the visible label. This holds every
 * page at none, so the next component or demo that leaves an icon unhidden fails here.
 *
 * Open overlays are held to the same check in showcase-open-overlays.spec.ts.
 */

const PAGES = showcasePages();

test('the page list is read from the registry', () => {
    // A registry the regex stopped matching would check three pages and report success.
    expect(PAGES.length).toBeGreaterThan(50);
});

for (const path of PAGES) {
    test(`no icon glyph in a name on ${path}`, async ({ page }) => {
        await page.goto(path);
        await hydrated(page);

        expect(glyphNames(await page.locator('body').ariaSnapshot())).toEqual([]);
    });
}
