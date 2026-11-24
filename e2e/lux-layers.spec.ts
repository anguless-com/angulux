import { expect, test, type Page } from '@playwright/test';

/**
 * The shape of the layers that float above a page, in Lux and in Lux Compact: a modal dialog, the
 * list of a select, a popup menu, a popover, a tooltip, a toast, a drawer and the panel of a date
 * picker.
 *
 * WHY A SECOND FILE. e2e/lux-shape.spec.ts measures a page of ordinary UI, and nothing on that page
 * floats. Lux changes four tokens that only a floating layer reads (the radius and the shadow of a
 * select's list, of a popover, of a modal, and the shadow of a navigation layer), and eight
 * components take their look from those four. When Lux got its shape they were photographed and
 * read by hand. This file is that reading, made repeatable.
 *
 * One layer per page load: most of them close when another opens. Each is measured after its enter
 * motion has ended.
 *
 * NO HEIGHT IS STATED IN PIXELS, for the reason lux-shape.spec.ts gives: a line of text is as tall
 * as the platform's font makes it. Heights are compared between two presets on the same page.
 * Corners and shadows are tokens with no font in them, and those are stated.
 *
 * NOT COVERED: the dark scheme, whose shape tokens are the same ones; a layer placed where it does
 * not fit and has to flip; and whether a shadow can be SEEN. In the dark scheme it mostly cannot,
 * and a layer is told apart from the page by its border. That was looked at, not measured.
 *
 * The page is apps/verify/src/lux-layers.ts.
 */

type Preset = 'aura' | 'lux' | 'compact';
type View = 'dialog' | 'select' | 'menu' | 'popover' | 'tooltip' | 'toast' | 'drawer' | 'datepicker';

interface Layer {
    radius: string;
    shadow: string;
    /** One option of a select or one item of a menu. Null where a layer has no such row. */
    item: { height: number; radius: string } | null;
}

/** How a layer is opened, the element whose corners and shadow are the layer's, and a row inside it. */
const LAYERS: Record<View, { open?: (page: Page) => Promise<void>; layer: string; item?: string }> = {
    dialog: { layer: '.p-dialog' },
    select: { open: (page) => page.locator('.p-select').click(), layer: '.p-select-overlay', item: '.p-select-option' },
    menu: { open: (page) => page.locator('#open button').click(), layer: '.p-menu', item: '.p-menu-item-content' },
    popover: { open: (page) => page.locator('#open button').click(), layer: '.p-popover' },
    // The tooltip is a positioned wrapper; the box that is drawn is its text.
    tooltip: { open: (page) => page.locator('#open button').hover(), layer: '.p-tooltip-text' },
    toast: { open: (page) => page.locator('#open button').click(), layer: '.p-toast-message' },
    drawer: { layer: '.p-drawer' },
    datepicker: { open: (page) => page.locator('#due').click(), layer: '.p-datepicker-panel' }
};

async function measure(page: Page, preset: Preset, view: View): Promise<Layer> {
    const { open, layer, item } = LAYERS[view];

    await page.goto(`/lux-layers?preset=${preset}&view=${view}`);
    await open?.(page);
    await expect(page.locator(layer).first()).toBeVisible();
    // A layer scales and fades in. Its shadow and corners are final from the first frame, its box is not.
    await page.evaluate(() =>
        Promise.all(
            document
                .getAnimations()
                .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
                .map((a) => a.finished.catch(() => undefined))
        )
    );

    return page.evaluate(
        ({ layer, item }): Layer => {
            const el = document.querySelector(layer);
            if (!el) throw new Error(`nothing matches ${layer}`);
            const style = getComputedStyle(el);
            const row = item ? document.querySelector(item) : null;
            if (item && !row) throw new Error(`nothing matches ${item}`);

            return {
                radius: style.borderRadius,
                shadow: style.boxShadow,
                item: row ? { height: Math.round(row.getBoundingClientRect().height * 10) / 10, radius: getComputedStyle(row).borderRadius } : null
            };
        },
        { layer, item }
    );
}

/** The two shadows Lux gives a floating layer, as Chrome reports them. */
const SOFT = 'rgba(0, 0, 0, 0.06) 0px 1px 2px 0px, rgba(0, 0, 0, 0.08) 0px 6px 16px 0px';
const MODAL = 'rgba(0, 0, 0, 0.06) 0px 2px 4px 0px, rgba(0, 0, 0, 0.14) 0px 16px 40px 0px';

/** Corner radius of each layer: in the upstream preset, and in Lux. A drawer is flush with the screen edge in both. */
const RADIUS: Record<View, [upstream: string, lux: string]> = {
    dialog: ['12px', '16px'],
    select: ['6px', '8px'],
    menu: ['6px', '8px'],
    popover: ['6px', '8px'],
    tooltip: ['6px', '8px'],
    toast: ['6px', '8px'],
    drawer: ['0px', '0px'],
    datepicker: ['6px', '8px']
};

const VIEWS = Object.keys(LAYERS) as View[];

for (const view of VIEWS) {
    test(`${view}: Lux has the corners it is described with, and the upstream preset the ones it is compared to`, async ({ page }) => {
        const aura = await measure(page, 'aura', view);
        const lux = await measure(page, 'lux', view);

        expect(aura.radius, 'upstream').toBe(RADIUS[view][0]);
        expect(lux.radius, 'Lux').toBe(RADIUS[view][1]);
    });
}

test('Lux draws one shadow under every layer that drops from a control, and one under a modal and a drawer', async ({ page }) => {
    for (const view of ['select', 'menu', 'popover', 'tooltip', 'datepicker'] as const) {
        expect((await measure(page, 'lux', view)).shadow, view).toBe(SOFT);
    }
    for (const view of ['dialog', 'drawer'] as const) {
        expect((await measure(page, 'lux', view)).shadow, view).toBe(MODAL);
    }
    // A toast keeps the shadow tinted with its severity colour, which Lux does not change.
    expect((await measure(page, 'lux', 'toast')).shadow).toBe((await measure(page, 'aura', 'toast')).shadow);
});

test('an option of a select and an item of a menu have 6px corners in Lux, where the upstream preset has 4px', async ({ page }) => {
    for (const view of ['select', 'menu'] as const) {
        expect((await measure(page, 'aura', view)).item?.radius, `${view}, upstream`).toBe('4px');
        expect((await measure(page, 'lux', view)).item?.radius, `${view}, Lux`).toBe('6px');
    }
});

test('Lux is as tall per row as the upstream preset, and Lux Compact is 4px shorter per row', async ({ page }) => {
    for (const view of ['select', 'menu'] as const) {
        const aura = await measure(page, 'aura', view);
        const lux = await measure(page, 'lux', view);
        const compact = await measure(page, 'compact', view);

        expect(lux.item?.height, `${view}: Lux against upstream`).toBe(aura.item?.height);
        // 2px less padding above and below.
        expect((lux.item?.height ?? 0) - (compact.item?.height ?? 0), `${view}: Lux against Lux Compact`).toBeCloseTo(4, 1);
    }
});

test('Lux Compact changes no corner and no shadow of any layer', async ({ page }) => {
    for (const view of VIEWS) {
        const lux = await measure(page, 'lux', view);
        const compact = await measure(page, 'compact', view);

        expect({ radius: compact.radius, shadow: compact.shadow, item: compact.item?.radius }, view).toEqual({ radius: lux.radius, shadow: lux.shadow, item: lux.item?.radius });
    }
});
