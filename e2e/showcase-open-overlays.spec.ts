import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { glyphNames } from './glyph-names';
import { hydrated } from './hydrated';
import { pixelPng } from './pixel-png';

/**
 * Overlays opened on the showcase, then scanned with axe.
 *
 * The site-wide sweep (showcase-axe.spec.ts) scans each page as it loads, with every overlay
 * closed, so what an overlay renders only once it is open is never scanned there. Each case here
 * opens one the way a reader would and runs the same WCAG rules on it, in light and in dark. It
 * also checks that no name inside the overlay carries an icon glyph, which axe does not report.
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
    /**
     * Every WCAG rule but these, for an overlay that breaks a rule as a documented, known limit.
     * The case says which, and where the limit is documented.
     */
    disable?: string[];
};

/**
 * Waits until an open overlay has finished its enter motion. The motion can run on the panel,
 * inside it, or on a wrapper around it (an overlay's, as with Password); a fade written frame by
 * frame into style.opacity (Tooltip's) is in no animation list, so the opacity of the panel and of
 * every element around it has to reach 1 as well.
 */
const settled = (page: Page, panel: string) =>
    page.waitForFunction((selector) => {
        const open = document.querySelector(selector)!;
        const chain: Element[] = [];

        for (let el: Element | null = open; el; el = el.parentElement) chain.push(el);

        const moving = [...open.getAnimations({ subtree: true }), ...chain.flatMap((el) => el.getAnimations())].some((a) => a.playState === 'running');
        const opacity = chain.reduce((product, el) => product * Number(getComputedStyle(el).opacity), 1);

        return !moving && opacity === 1;
    }, panel);

/** Clicks the button with this name inside one demo. */
const press = (demo: string, name: string) => (page: Page) => page.locator(demo).getByRole('button', { name, exact: true }).click();

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
        // and the arrow keys scroll it. That is a known limit, not a fault: Select's own
        // documentation says why the list gets no tab stop.
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
        // Each option used to hold a checkbox that assistive technology saw as a control nested in
        // the option (nested-interactive). The option says it is selected; the checkbox only shows it.
        name: 'MultiSelect',
        path: '/multiselect',
        open: (page) => page.locator('agl-multiselect-basic-doc agl-multiselect').click(),
        panel: '.p-multiselect-overlay',
        holds: { selector: 'input[role="searchbox"]', count: 1 }
    },
    {
        // This demo sets ariaFilterLabel. Its five options overflow the list, which axe reports as a
        // scroll region the keyboard cannot reach (scrollable-region-focusable). Focus stays in the
        // filter and the arrow keys scroll the list, as in Select, whose documentation records it as
        // a known limit. The checkboxes' inputs used to hide it: axe counted them as focusable.
        name: 'MultiSelect with a named filter',
        path: '/multiselect',
        open: (page) => page.locator('agl-multiselect-filter-doc agl-multiselect').click(),
        panel: '.p-multiselect-overlay',
        holds: { selector: 'input[role="searchbox"]', count: 1 },
        disable: ['scrollable-region-focusable']
    },

    // The overlays below broke no rule when they were added. Each case keeps its overlay that way.
    {
        name: 'Select',
        path: '/select',
        open: (page) => page.locator('agl-select-basic-doc agl-select').click(),
        panel: '.p-select-overlay',
        holds: { selector: '[role="option"]', count: 4 }
    },
    {
        name: 'DatePicker',
        path: '/datepicker',
        open: (page) => page.locator('agl-datepicker-basic-doc input').click(),
        panel: '.p-datepicker-panel[role="dialog"]',
        holds: { selector: 'table[role="grid"]', count: 1 }
    },
    {
        name: 'Dialog',
        path: '/dialog',
        open: press('agl-dialog-basic-doc', 'Show'),
        panel: '.p-dialog',
        // The close button.
        holds: { selector: 'button', count: 1 }
    },
    {
        name: 'Modal Dialog',
        path: '/dialog',
        open: press('agl-dialog-modal-doc', 'Show modal'),
        panel: '.p-dialog',
        // Close, Cancel and Confirm.
        holds: { selector: 'button', count: 3 }
    },
    {
        name: 'Drawer',
        path: '/drawer',
        open: press('agl-drawer-basic-doc', 'Open'),
        panel: '.p-drawer',
        // The close button.
        holds: { selector: 'button', count: 1 }
    },
    {
        name: 'ConfirmDialog',
        path: '/confirmdialog',
        open: press('agl-confirmdialog-basic-doc', 'Delete'),
        panel: '.p-confirmdialog',
        // Close, reject and accept.
        holds: { selector: 'button', count: 3 }
    },
    {
        name: 'Popover',
        path: '/popover',
        open: press('agl-popover-basic-doc', 'Show'),
        panel: '.p-popover',
        holds: { selector: 'p', count: 1 }
    },
    {
        name: 'Popup Menu',
        path: '/menu',
        open: press('agl-menu-popup-doc', 'Show'),
        panel: '.p-menu-overlay',
        holds: { selector: '[role="menuitem"]', count: 4 }
    },
    {
        // The two root items; their submenus stay closed.
        name: 'Popup TieredMenu',
        path: '/tieredmenu',
        open: press('agl-tieredmenu-popup-doc', 'Show'),
        panel: '.p-tieredmenu-overlay',
        holds: { selector: '[role="menuitem"]:visible', count: 2 }
    },
    {
        name: 'SplitButton menu',
        path: '/splitbutton',
        open: press('agl-splitbutton-basic-doc', 'More actions'),
        panel: '.p-tieredmenu-overlay',
        holds: { selector: '[role="menuitem"]', count: 2 }
    },
    {
        // Another demo on the page shows the same message, so the case keeps to this one. The pointer
        // rests on the message, which stops its timer: it stays until the scan is done.
        name: 'Toast',
        path: '/toast',
        open: async (page) => {
            await press('agl-toast-basic-doc', 'Show')(page);
            await page.locator('agl-toast-basic-doc .p-toast-message').hover();
        },
        panel: 'agl-toast-basic-doc .p-toast-message',
        // The close button.
        holds: { selector: 'button', count: 1 }
    },
    {
        name: 'Tooltip',
        path: '/tooltip',
        open: (page) => page.locator('agl-tooltip-basic-doc input').hover(),
        panel: '.p-tooltip',
        holds: { selector: '.p-tooltip-text', count: 1 }
    },
    {
        name: 'Password strength meter',
        path: '/password',
        open: (page) => page.locator('agl-password-meter-doc input').fill('abc12'),
        panel: '.p-password-overlay',
        holds: { selector: '.p-password-meter', count: 1 }
    },
    // ColorPicker is not here. Its open panel holds no text and no element with a role, so axe has
    // no rule to run on it, and the check that axe ran one would fail the case. Its colour area and
    // hue bar take the pointer only, which no axe rule looks for.
    {
        name: 'Overlay',
        path: '/overlay',
        open: press('agl-overlay-basic-doc', 'Toggle'),
        panel: '.p-overlay',
        holds: { selector: 'p', count: 1 }
    },
    {
        // Not an overlay, but hidden from the page sweep the same way: FileUpload lists the files only
        // once some are chosen. The button beside each one, which takes it off the list, shows only an
        // icon and had no name (button-name).
        name: 'FileUpload file list',
        path: '/fileupload',
        // FileUpload renders two file inputs, one at its root and one in the Choose button, and reads
        // a choice from either the same way. The demo accepts images only.
        open: (page) => page.locator('agl-fileupload-advanced-doc input[type="file"]').first().setInputFiles(pixelPng()),
        panel: 'agl-fileupload-advanced-doc [data-pc-section="filelist"]',
        // The remove button.
        holds: { selector: 'button', count: 1 }
    },
    {
        // Not an overlay either: the editable Select once text is typed into it. Its input dropped
        // the placeholder when the model had a value, and the demo names it by its placeholder alone,
        // so typing left it with no name (label).
        name: 'Select, editable, after typing',
        path: '/select',
        open: (page) => page.locator('agl-select-editable-doc input[role="combobox"]').fill('Rome'),
        panel: 'agl-select-editable-doc agl-select',
        holds: { selector: 'input[role="combobox"]', count: 1 }
    }
];

for (const c of CASES) {
    for (const scheme of ['light', 'dark'] as const) {
        test(`${c.name}, open, in ${scheme}: no ${c.rules ? c.rules.join(', ') + ' ' : 'accessibility '}violation inside it${c.disable ? ` but ${c.disable.join(', ')}` : ''}`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: scheme });
            await page.goto(c.path);
            await hydrated(page);
            expect(await page.evaluate(() => document.documentElement.classList.contains('dark')), `the page is in the ${scheme} scheme`).toBe(scheme === 'dark');

            await c.open(page);
            const panel = page.locator(c.panel);

            await expect(panel).toBeVisible();
            await expect(panel.locator(c.holds.selector)).toHaveCount(c.holds.count);
            // Scanned once the enter motion has finished, not halfway through a fade.
            await settled(page, c.panel);

            const axe = new AxeBuilder({ page }).include(c.panel);
            const result = await (c.rules ? axe.withRules(c.rules) : axe.withTags(TAGS).disableRules(c.disable ?? [])).analyze();

            // Violations first: when the only element a rule applies to breaks it, axe records no
            // pass either, and the failure should name the violation rather than the empty pass list.
            expect(result.violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} — ${v.help}`))).toEqual([]);
            expect(result.passes.length, 'axe ran no rule on the overlay').toBeGreaterThan(0);
            // axe does not report an icon glyph in a name; see glyph-names.ts.
            expect(glyphNames(await panel.ariaSnapshot()), 'a name inside the overlay carries an icon glyph').toEqual([]);
        });
    }
}

// Each option's checkbox is inert, so that assistive technology meets the option alone. A click on
// the checkbox then lands on the option underneath, which has to choose it as it always did.
test('MultiSelect: a click on an option checkbox chooses the option, and a second click clears it', async ({ page }) => {
    await page.goto('/multiselect');
    await hydrated(page);
    await page.locator('agl-multiselect-basic-doc agl-multiselect').click();

    const panel = '.p-multiselect-overlay';
    await expect(page.locator(panel)).toBeVisible();
    // Measured once the panel has stopped moving: a box read during the enter motion is not
    // where the checkbox ends up.
    await settled(page, panel);

    const option = page.locator(`${panel} [role="option"]`).first();
    const clickTheCheckbox = async () => {
        const box = await option.locator('agl-checkbox').boundingBox();
        expect(box, 'the checkbox is on screen').not.toBeNull();
        await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    };

    await expect(option).toHaveAttribute('aria-selected', 'false');
    await clickTheCheckbox();
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await clickTheCheckbox();
    await expect(option).toHaveAttribute('aria-selected', 'false');
});
