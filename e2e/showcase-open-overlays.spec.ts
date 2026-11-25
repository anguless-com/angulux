import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * Overlays opened on the showcase, then scanned with axe.
 *
 * The site-wide sweep (showcase-axe.spec.ts) scans each page as it loads, with every overlay
 * closed, so what an overlay renders only once it is open is never scanned there. Each case here
 * opens one the way a reader would and runs the same WCAG rules on it, in light and in dark.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

type Case = {
    name: string;
    path: string;
    open: (page: Page) => Promise<unknown>;
    /** The open overlay; the scan is limited to it. */
    panel: string;
    /** Something the open overlay must contain, so that a scan of an empty panel cannot pass. */
    holds: { selector: string; count: number };
    /**
     * Only these axe rules, for an overlay that still breaks another rule whose fix is an open
     * question. The case says which, and why; without `rules` every WCAG rule applies.
     */
    rules?: string[];
};

const CASES: Case[] = [
    {
        // Icon-only buttons: they had no name, since it was bound to the agl-button host.
        name: 'DatePicker with a time picker',
        path: '/datepicker',
        open: (page) => page.locator('agl-datepicker-time-doc input').click(),
        // Not the inline demo's panel, which is on the same page.
        panel: '.p-datepicker-panel[role="dialog"]',
        holds: { selector: '[data-pc-group-section="timepickerbutton"] button', count: 4 }
    },
    {
        // The filter box had no name unless the app set ariaFilterLabel. This demo sets it.
        // Only `label`: the list scrolling inside the overlay is reported as a scroll region the
        // keyboard cannot reach (scrollable-region-focusable), though focus stays in the filter
        // and the arrow keys scroll it. Whether to change that is still open.
        name: 'Select with a filter',
        path: '/select',
        open: (page) => page.locator('agl-select-filter-doc agl-select').click(),
        panel: '.p-select-overlay',
        holds: { selector: 'input[role="searchbox"]', count: 1 },
        rules: ['label']
    },
    {
        // MultiSelect shows a filter by default. This demo sets no ariaFilterLabel, so the box
        // takes the name of the MultiSelect itself (its ariaLabel).
        // Only `label`: each option holds a checkbox, reported as a control nested in a control
        // (nested-interactive). Whether to change that is still open.
        name: 'MultiSelect',
        path: '/multiselect',
        open: (page) => page.locator('agl-multiselect-basic-doc agl-multiselect').click(),
        panel: '.p-multiselect-overlay',
        holds: { selector: 'input[role="searchbox"]', count: 1 },
        rules: ['label']
    },
    {
        // This demo sets ariaFilterLabel. Only `label`, for the reason above.
        name: 'MultiSelect with a named filter',
        path: '/multiselect',
        open: (page) => page.locator('agl-multiselect-filter-doc agl-multiselect').click(),
        panel: '.p-multiselect-overlay',
        holds: { selector: 'input[role="searchbox"]', count: 1 },
        rules: ['label']
    }
];

for (const c of CASES) {
    for (const scheme of ['light', 'dark'] as const) {
        test(`${c.name}, open, in ${scheme}: no ${c.rules ? c.rules.join(', ') + ' ' : 'accessibility '}violation inside it`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: scheme });
            await page.goto(c.path);
            await hydrated(page);
            expect(await page.evaluate(() => document.documentElement.classList.contains('dark')), `the page is in the ${scheme} scheme`).toBe(scheme === 'dark');

            await c.open(page);
            const panel = page.locator(c.panel);

            await expect(panel).toBeVisible();
            await expect(panel.locator(c.holds.selector)).toHaveCount(c.holds.count);
            // Scanned once the enter motion has finished, not halfway through a fade.
            await page.waitForFunction((selector) => {
                const open = document.querySelector(selector)!;

                return open.getAnimations({ subtree: true }).every((a) => a.playState !== 'running');
            }, c.panel);

            const axe = new AxeBuilder({ page }).include(c.panel);
            const result = await (c.rules ? axe.withRules(c.rules) : axe.withTags(TAGS)).analyze();

            // Violations first: when the only element a rule applies to breaks it, axe records no
            // pass either, and the failure should name the violation rather than the empty pass list.
            expect(result.violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} — ${v.help}`))).toEqual([]);
            expect(result.passes.length, 'axe ran no rule on the overlay').toBeGreaterThan(0);
        });
    }
}
