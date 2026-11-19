import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * The line above a selected row: drawn from a class Table sets, it must look exactly as it did when
 * a sibling `:has()` drew it.
 *
 * The stylesheet drew that line with `tr:has(+ .p-datatable-row-selected) > td`, recolouring the
 * bottom border of the row before a selected one. Chrome re-evaluates a sibling `:has()` for every
 * row inserted beside it, so rendering a long table grew with the square of its rows (#168, upstream
 * 22.1.3). Table now puts `p-datatable-row-before-selected` on that row after each change detection
 * (markRowsBeforeSelected in table.ts), and the stylesheet recolours the same border from the class.
 *
 * Two replacements that draw the line from the selected row itself, with a box-shadow, were built
 * and rejected first (2026-11-18). They were byte-identical at device pixel ratios 1 and 2. But a
 * box-shadow cut at a fractional edge leaves faint hairlines. And on Linux (CI) a box-shadow inside a
 * composited scroller switched all the text in it from LCD to greyscale anti-aliasing: 3,519 against
 * 1,874 colour-fringed text pixels in the same scene. The class keeps the very same primitive, so
 * none of that can happen. This test is the proof: every scene must be byte-identical.
 *
 * How the comparison works. The page (apps/verify/src/table-edge.ts) renders each layout the
 * stylesheet treats apart. The test removes BOTH rules from the page's stylesheets and adds back one
 * of them, so it compares the two the same way whichever the build ships. Each scene is screenshotted
 * with each rule, in every preset, both colour schemes and four device pixel ratios. A premise check
 * requires the old rule to change the picture where it applies, so the comparison cannot pass by
 * drawing nothing.
 *
 * Why a differing pair is photographed again before it counts. At the fractional ratios the
 * rasteriser is not perfectly repeatable on the CI runners: twice on 2026-11-19 a scene came back
 * with one row of pixels off by ONE level in ONE channel (254,254,255 against 254,254,254, in the
 * anti-aliased row under a border), with every line in the same place in both pictures — once in
 * `d-gridlines-ends`, a scene where neither rule draws anything at all. That is noise in the
 * measurement, and it failed two pull requests that had not touched a stylesheet. So a pair that
 * differs is taken again, up to ATTEMPTS times, and the scene passes when any pair is
 * byte-identical. The bar itself has not moved: a rule that really draws differently does so
 * every time, and fails every attempt. Each retake is logged, so the noise stays visible.
 */

/** How many times a scene's old/new pair is photographed before a difference is believed. */
const ATTEMPTS = 3;

const OLD_RULE = '.p-datatable-tbody > tr:has(+ .p-datatable-row-selected) > td { border-block-end-color: var(--p-datatable-body-cell-selected-border-color); }';
const NEW_RULE = '.p-datatable-tbody > tr.p-datatable-row-before-selected > td { border-block-end-color: var(--p-datatable-body-cell-selected-border-color); }';

const SCENES = [
    'd-default',
    'd-default-ends',
    'd-gridlines',
    'd-gridlines-ends',
    'd-gridlines-noheader',
    'd-striped-small',
    'd-large-noheader',
    'd-hover',
    'd-focus',
    'd-drop-top',
    'd-drop-bottom',
    'd-drop-before',
    'd-none',
    'd-frozen',
    'd-nested-in-plain',
    'd-nested-in-gridlines'
];

/** Scenes where the old rule draws something, so "none" must differ from "old" there. */
const OLD_RULE_VISIBLE = ['d-default', 'd-gridlines', 'd-striped-small', 'd-large-noheader', 'd-frozen', 'd-nested-in-gridlines'];

type State = 'none' | 'old' | 'new';

/** Remove both rules from the page and add back the one asked for. */
async function setState(page: Page, state: State): Promise<void> {
    await page.evaluate(
        ({ state, oldRule, newRule }) => {
            const isEdgeRule = (rule: CSSRule): boolean =>
                rule instanceof CSSStyleRule && (/:has\(\+\s*\.p-datatable-row-selected\)/.test(rule.selectorText) || rule.selectorText.includes('p-datatable-row-before-selected'));
            const strip = (list: CSSRuleList) => {
                for (let i = list.length - 1; i >= 0; i--) {
                    const rule = list[i];
                    if (isEdgeRule(rule)) {
                        const parent = rule.parentRule as CSSGroupingRule | null;
                        if (parent) parent.deleteRule(i);
                        else rule.parentStyleSheet!.deleteRule(i);
                    } else if ('cssRules' in rule) strip((rule as CSSGroupingRule).cssRules);
                }
            };
            document.getElementById('edge-probe')?.remove();
            for (const sheet of Array.from(document.styleSheets)) {
                try {
                    strip(sheet.cssRules);
                } catch {
                    /* a cross-origin sheet: none of ours */
                }
            }
            const style = document.createElement('style');
            style.id = 'edge-probe';
            style.textContent = state === 'old' ? oldRule : state === 'new' ? newRule : '';
            document.head.appendChild(style);
        },
        { state, oldRule: OLD_RULE, newRule: NEW_RULE }
    );
}

/** Put a scene in the state its name describes. Runs once; the classes and focus stay across states. */
async function prepare(page: Page, scene: string): Promise<void> {
    const rows = page.locator(`#${scene} .p-datatable-tbody > tr`);
    if (scene === 'd-drop-top') await rows.nth(2).evaluate((tr) => tr.classList.add('p-datatable-dragpoint-top'));
    if (scene === 'd-drop-bottom') await rows.nth(2).evaluate((tr) => tr.classList.add('p-datatable-dragpoint-bottom'));
    if (scene === 'd-drop-before') await rows.nth(3).evaluate((tr) => tr.classList.add('p-datatable-dragpoint-bottom'));
}

async function shoot(page: Page, scene: string): Promise<Buffer> {
    if (scene === 'd-hover') await page.locator(`#${scene} .p-datatable-tbody > tr`).nth(1).hover();
    else await page.mouse.move(0, 0);
    if (scene === 'd-focus') await page.locator(`#${scene} .p-datatable-tbody > tr`).nth(2).focus();
    return page.locator(`#${scene}`).screenshot({ animations: 'disabled', caret: 'hide' });
}

/** Count the pixels that differ between two PNG screenshots of the same size, in the browser. */
async function differingPixels(page: Page, a: Buffer, b: Buffer): Promise<{ count: number; box: number[] }> {
    return page.evaluate(
        async ({ a, b }) => {
            const load = (src: string) =>
                new Promise<HTMLImageElement>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.src = `data:image/png;base64,${src}`;
                });
            const [ia, ib] = await Promise.all([load(a), load(b)]);
            const read = (img: HTMLImageElement) => {
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                return ctx.getImageData(0, 0, img.width, img.height).data;
            };
            if (ia.width !== ib.width || ia.height !== ib.height) return { count: -1, box: [ia.width, ia.height, ib.width, ib.height] };
            const da = read(ia);
            const db = read(ib);
            let count = 0;
            let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
            for (let i = 0; i < da.length; i += 4) {
                if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) {
                    count++;
                    const p = i / 4;
                    x0 = Math.min(x0, p % ia.width);
                    y0 = Math.min(y0, Math.floor(p / ia.width));
                    x1 = Math.max(x1, p % ia.width);
                    y1 = Math.max(y1, Math.floor(p / ia.width));
                }
            }
            return { count, box: count ? [x0, y0, x1, y1] : [] };
        },
        { a: a.toString('base64'), b: b.toString('base64') }
    );
}

for (const dpr of [1, 1.25, 1.5, 2]) {
    test.describe(`device pixel ratio ${dpr}`, () => {
        test.use({ deviceScaleFactor: dpr, viewport: { width: 1280, height: 900 } });

        for (const preset of ['aura', 'lara', 'nora', 'material']) {
            for (const scheme of ['light', 'dark'] as const) {
                test(`${preset} ${scheme}: the class draws the line above a selected row exactly as the sibling :has() did`, async ({ page }) => {
                    const errors: string[] = [];
                    page.on('pageerror', (e) => errors.push(e.message));
                    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
                    await page.goto(`/table-edge?preset=${preset}`);
                    await expect(page.locator('#d-nested-in-gridlines .p-datatable-tbody .p-datatable-tbody > tr').first()).toBeVisible();
                    await page.evaluate(() => document.fonts.ready);

                    const report: string[] = [];
                    for (const scene of SCENES) {
                        await page.locator(`#${scene}`).scrollIntoViewIfNeeded();
                        await prepare(page, scene);
                        await setState(page, 'none');
                        const none = await shoot(page, scene);
                        let old!: Buffer;
                        let fresh!: Buffer;
                        for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
                            await setState(page, 'old');
                            old = await shoot(page, scene);
                            await setState(page, 'new');
                            fresh = await shoot(page, scene);
                            if (old.equals(fresh)) break;
                            if (attempt < ATTEMPTS) {
                                const noise = await differingPixels(page, old, fresh);
                                console.log(`[edge ${dpr} ${preset} ${scheme}] ${scene}: attempt ${attempt} differed (${noise.count} pixels in ${JSON.stringify(noise.box)}), photographing again`);
                            }
                        }

                        if (OLD_RULE_VISIBLE.includes(scene)) {
                            expect(old.equals(none), `${scene}: the old rule changes the picture (premise)`).toBe(false);
                        }
                        if (!old.equals(fresh)) {
                            const diff = await differingPixels(page, old, fresh);
                            report.push(`${scene}: ${diff.count} pixels differ in ${JSON.stringify(diff.box)}`);
                            writeFileSync(test.info().outputPath(`${scene}-old.png`), old);
                            writeFileSync(test.info().outputPath(`${scene}-new.png`), fresh);
                        }
                    }
                    console.log(`[edge ${dpr} ${preset} ${scheme}] ${report.length ? 'FAIL ' + report.join(' | ') : 'identical'}`);
                    expect(report, 'scenes the class draws differently').toEqual([]);
                    expect(errors).toEqual([]);
                });
            }
        }
    });
}

test('the class follows the selected row through selection changes and sorting', async ({ page }) => {
    await page.goto('/table-edge?preset=aura');
    const rows = page.locator('#d-live .p-datatable-tbody > tr');
    await expect(rows).toHaveCount(6);
    const marked = () => page.locator('#d-live .p-datatable-tbody > tr.p-datatable-row-before-selected');

    await expect(marked()).toHaveCount(0);
    await rows.nth(2).click();
    await expect(marked()).toHaveCount(1);
    await expect(rows.nth(1)).toHaveClass(/p-datatable-row-before-selected/);

    await rows.nth(4).click();
    await expect(marked()).toHaveCount(1);
    await expect(rows.nth(3)).toHaveClass(/p-datatable-row-before-selected/);
    await expect(rows.nth(1)).not.toHaveClass(/p-datatable-row-before-selected/);

    // Sorting moves the selected row; the mark moves to whatever row now comes right before it.
    await page.locator('#live-sort').click();
    await page.locator('#live-sort').click();
    await expect(page.locator('#live-sort')).toHaveAttribute('aria-sort', 'descending');
    const selectedIndex = await rows.evaluateAll((list) => list.findIndex((tr) => tr.classList.contains('p-datatable-row-selected')));
    expect(selectedIndex).toBeGreaterThan(0);
    await expect(marked()).toHaveCount(1);
    expect(await marked().getAttribute('data-id')).toBe(await rows.nth(selectedIndex - 1).getAttribute('data-id'));

    // And the line is drawn: the marked row's cells take the selected border colour.
    const colours = await page.evaluate(() => {
        const cell = (selector: string) => document.querySelector(`#d-live .p-datatable-tbody > tr${selector} > td`);
        const marked = cell('.p-datatable-row-before-selected');
        const plain = cell(':not(.p-datatable-row-before-selected):not(.p-datatable-row-selected)');
        return { marked: getComputedStyle(marked!).borderBottomColor, plain: getComputedStyle(plain!).borderBottomColor };
    });
    expect(colours.marked).not.toBe(colours.plain);

    // Unselecting clears the mark.
    await page.locator('#d-live .p-datatable-tbody > tr.p-datatable-row-selected').click({ modifiers: ['ControlOrMeta'] });
    await expect(page.locator('#d-live .p-datatable-tbody > tr.p-datatable-row-selected')).toHaveCount(0);
    await expect(marked()).toHaveCount(0);
});

test('the class follows the selected row as virtual scrolling brings it into view and out again', async ({ page }) => {
    await page.goto('/table-edge?preset=aura');
    const scene = page.locator('#d-virtual');
    await expect(scene.locator('.p-datatable-tbody > tr').first()).toBeVisible();
    const selected = scene.locator('.p-datatable-tbody > tr.p-datatable-row-selected');
    const marked = scene.locator('.p-datatable-tbody > tr.p-datatable-row-before-selected');
    await expect(selected).toHaveCount(0);
    await expect(marked).toHaveCount(0);

    // Row 50 of 200 is selected; bring it into view.
    await scene.locator('.p-virtualscroller').evaluate((scroller) => (scroller.scrollTop = 45 * 46));
    await expect(selected).toHaveAttribute('data-id', 'v50');
    await expect(marked).toHaveCount(1);
    await expect(marked).toHaveAttribute('data-id', 'v49');

    // And out of view again: no row is left marked.
    await scene.locator('.p-virtualscroller').evaluate((scroller) => (scroller.scrollTop = 0));
    await expect(scene.locator('.p-datatable-tbody > tr').first()).toHaveAttribute('data-id', 'v0');
    await expect(selected).toHaveCount(0);
    await expect(marked).toHaveCount(0);
});

test('the shipped Table stylesheet draws the line from the class and has no sibling :has()', async ({ page }) => {
    await page.goto('/table-edge?preset=aura');
    await expect(page.locator('#d-default .p-datatable-tbody > tr').first()).toBeVisible();
    const found = await page.evaluate(() => {
        let siblingHas = 0;
        let classRule = 0;
        for (const sheet of Array.from(document.styleSheets))
            for (const rule of Array.from(sheet.cssRules)) {
                if (!(rule instanceof CSSStyleRule)) continue;
                if (/:has\(\+/.test(rule.selectorText) && rule.selectorText.includes('p-datatable')) siblingHas++;
                if (rule.selectorText === '.p-datatable-tbody > tr.p-datatable-row-before-selected > td' && rule.style.borderBlockEndColor.includes('--p-datatable-body-cell-selected-border-color')) classRule++;
            }
        return { siblingHas, classRule };
    });
    expect(found).toEqual({ siblingHas: 0, classRule: 1 });
});
