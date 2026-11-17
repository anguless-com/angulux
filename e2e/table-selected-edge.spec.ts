import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * The line above a selected row: the replacement of `tr:has(+ .p-datatable-row-selected) > td` must
 * draw what that rule drew.
 *
 * That rule recoloured the bottom border of the row before a selected row. Chrome re-evaluates a
 * sibling `:has()` for every row inserted next to it, so rendering a long Table grew with the square
 * of its rows (#168, upstream 22.1.3). Measured 2026-11-18 on the verify app, best of three: 1,000 /
 * 4,000 / 8,000 / 16,000 rows took 17 / 111 / 344 / 1,176 ms with it and 12 / 50 / 92 / 180 ms with the
 * replacement. TreeTable loads its own stylesheet, which never had the rule.
 *
 * The replacement draws the line from the selected row: `tr + tr:where(.p-datatable-row-selected)`
 * gets an upward 1px box-shadow over the row above's bottom border. A row paints after the cells of
 * the row before it, so the shadow lies over that border. Three details carry the rest:
 *   - A custom property on the table root switches the line off where the row above has no bottom
 *     border (gridlines without a header row). Nested tables each read their own root.
 *   - A frozen cell is positioned and paints after every row, so the selected row's frozen cell
 *     carries the shadow there too.
 *   - At a fractional device pixel ratio the shadow is inset half a pixel on each side. Its edges
 *     then never fall where the row's own edges are cut, which is what left a faint vertical
 *     hairline at every such edge.
 * A focused row keeps its focus shadow (Material draws a glow there), so it draws no line.
 *
 * How the comparison works. The page (apps/verify/src/table-edge.ts) renders each layout the
 * stylesheet treats apart. The test removes BOTH versions of the rule from the page's stylesheets
 * and adds back one of them from the texts below, so it compares the two the same way whichever
 * version the build ships. A last test pins the texts to what the build ships. Each scene is
 * screenshotted with the old rule and with the new one, in every preset, both colour schemes and
 * four device pixel ratios. At ratios 1 and 2 the plain layouts must be byte-identical; where they
 * cannot be, see mustBeIdentical(). A premise check requires the old rule to change the picture
 * where it applies, so the comparison cannot pass by drawing nothing.
 */

const OLD_RULES = ['.p-datatable-tbody > tr:has(+ .p-datatable-row-selected) > td { border-block-end-color: var(--p-datatable-body-cell-selected-border-color); }'];

const SELECTED_EDGE = '.p-datatable-tbody > tr + tr:where(.p-datatable-row-selected)';
const SELECTED_EDGE_FROZEN = '.p-datatable-tbody > tr + tr:where(.p-datatable-row-selected:not(:focus-visible, .p-datatable-contextmenu-row-selected)) > td:where(.p-datatable-frozen-column)';

const NEW_RULES = [
    '.p-datatable { --agl-datatable-selected-edge: var(--p-datatable-body-cell-selected-border-color); }',
    '.p-datatable-gridlines { --agl-datatable-selected-edge: transparent; }',
    '.p-datatable.p-datatable-gridlines:has(.p-datatable-thead):has(.p-datatable-tbody) { --agl-datatable-selected-edge: var(--p-datatable-body-cell-selected-border-color); }',
    `${SELECTED_EDGE}, ${SELECTED_EDGE_FROZEN} { box-shadow: 0 -1px 0 0 var(--agl-datatable-selected-edge); }`,
    `@media not ((resolution: 1x) or (resolution: 2x) or (resolution: 3x)) { ${SELECTED_EDGE}, ${SELECTED_EDGE_FROZEN} { box-shadow: 0 -1.5px 0 -0.5px var(--agl-datatable-selected-edge); } }`
];

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

/** Remove every version of the rule from the page and add back the one asked for. */
async function setState(page: Page, state: State): Promise<void> {
    await page.evaluate(
        ({ state, oldRules, newRules }) => {
            const isEdgeRule = (rule: CSSRule): boolean => {
                if (!(rule instanceof CSSStyleRule)) return false;
                const text = rule.cssText;
                return /:has\(\+\s*\.p-datatable-row-selected\)/.test(rule.selectorText) || text.includes('--agl-datatable-selected-edge');
            };
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
            style.textContent = (state === 'old' ? oldRules : state === 'new' ? newRules : []).join('\n');
            document.head.appendChild(style);
        },
        { state, oldRules: OLD_RULES, newRules: NEW_RULES }
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
async function differingPixels(page: Page, a: Buffer, b: Buffer): Promise<{ count: number; box: number[]; rows: number[]; deltas: number[] }> {
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
            if (ia.width !== ib.width || ia.height !== ib.height) return { count: -1, box: [ia.width, ia.height, ib.width, ib.height], rows: [], deltas: [] };
            const da = read(ia);
            const db = read(ib);
            let count = 0;
            let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
            const rows = new Map<number, number>();
            for (let i = 0; i < da.length; i += 4) {
                if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) {
                    count++;
                    const p = i / 4;
                    const x = p % ia.width;
                    const y = Math.floor(p / ia.width);
                    x0 = Math.min(x0, x);
                    y0 = Math.min(y0, y);
                    x1 = Math.max(x1, x);
                    y1 = Math.max(y1, y);
                    const delta = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
                    rows.set(y, Math.max(rows.get(y) ?? 0, delta));
                }
            }
            const sorted = [...rows.keys()].sort((p, q) => p - q);
            return { count, box: count ? [x0, y0, x1, y1] : [], rows: sorted, deltas: sorted.map((y) => rows.get(y)!) };
        },
        { a: a.toString('base64'), b: b.toString('base64') }
    );
}

/**
 * The device-pixel rows the line above each selected row can touch, in a scene's screenshot: from
 * one device pixel above the top of the row before's bottom border to one below the selected row's
 * top. The line is the only thing the rule draws, so a difference anywhere else is a real one.
 */
async function lineBands(page: Page, scene: string, dpr: number): Promise<number[][]> {
    return page.evaluate(
        ({ scene, dpr }) => {
            const host = document.getElementById(scene)!.getBoundingClientRect();
            return Array.from(document.querySelectorAll(`#${scene} tr.p-datatable-row-selected`))
                .filter((tr) => tr.previousElementSibling?.tagName === 'TR')
                .map((tr) => {
                    const top = tr.getBoundingClientRect().top - host.top;
                    return [Math.floor((top - 1) * dpr) - 1, Math.ceil(top * dpr) + 1];
                });
        },
        { scene, dpr }
    );
}

/** The largest per-channel difference anti-aliasing accounts for, off the line itself. */
const AA_DELTA = 12;

/**
 * Where the two rules cannot draw the same bytes, and why; everywhere else they must.
 *   - At a fractional device pixel ratio the border is anti-aliased across two device pixels,
 *     and the shadow, inset half a pixel on each side there, ends half a pixel short at a row's ends.
 *   - With gridlines, the old border met each vertical gridline in a corner split diagonally
 *     between the two colours; the shadow covers that joint whole.
 *   - A focused selected row keeps its focus shadow and draws no line. In Material that shadow is
 *     a glow that covered the old border anyway; in the other presets the line above a focused row
 *     is the plain border colour while it has focus.
 * In all three, a pixel may differ freely on the line above a selected row, and anywhere else by no
 * more than AA_DELTA per channel. That allowance is for one more effect: the old rule gave a cell one
 * border of a different colour, so Chrome drew all four of its borders as mitred polygons, and at a
 * fractional ratio that moves the anti-aliasing of the cell's other borders by a level or so.
 */
function mustBeIdentical(scene: string, preset: string, dpr: number): boolean {
    if (!Number.isInteger(dpr)) return false;
    if (scene.startsWith('d-gridlines') || scene.startsWith('d-nested')) return false;
    if (scene === 'd-focus') return false;
    return true;
}

for (const dpr of [1, 1.25, 1.5, 2]) {
    test.describe(`device pixel ratio ${dpr}`, () => {
        test.use({ deviceScaleFactor: dpr, viewport: { width: 1280, height: 900 } });

        for (const preset of ['aura', 'lara', 'nora', 'material']) {
            for (const scheme of ['light', 'dark'] as const) {
                test(`${preset} ${scheme}: the new rule draws the line above a selected row exactly as the old one did`, async ({ page }) => {
                    const errors: string[] = [];
                    page.on('pageerror', (e) => errors.push(e.message));
                    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
                    await page.goto(`/table-edge?preset=${preset}`);
                    await expect(page.locator('#d-nested-in-gridlines .p-datatable-tbody .p-datatable-tbody > tr').first()).toBeVisible();
                    await page.evaluate(() => document.fonts.ready);

                    const report: string[] = [];
                    const confined: string[] = [];
                    for (const scene of SCENES) {
                        await page.locator(`#${scene}`).scrollIntoViewIfNeeded();
                        await prepare(page, scene);
                        await setState(page, 'none');
                        const none = await shoot(page, scene);
                        await setState(page, 'old');
                        const old = await shoot(page, scene);
                        await setState(page, 'new');
                        const fresh = await shoot(page, scene);

                        if (OLD_RULE_VISIBLE.includes(scene)) {
                            expect(old.equals(none), `${scene}: the old rule changes the picture (premise)`).toBe(false);
                        }
                        if (!old.equals(fresh)) {
                            const diff = await differingPixels(page, old, fresh);
                            const bands = await lineBands(page, scene, dpr);
                            const offLine = diff.rows.map((y, k) => [y, diff.deltas[k]]).filter(([y]) => !bands.some(([a, b]) => y >= a && y <= b));
                            const worst = Math.max(0, ...offLine.map(([, d]) => d));
                            if (!mustBeIdentical(scene, preset, dpr) && diff.count > 0 && worst <= AA_DELTA) {
                                confined.push(`${scene} ${diff.count}px${offLine.length ? ` (off the line ≤${worst})` : ''}`);
                                continue;
                            }
                            report.push(`${scene}: ${diff.count} pixels differ in ${JSON.stringify(diff.box)}, worst off the line ${worst} in rows ${JSON.stringify(offLine.slice(0, 6))}`);
                            writeFileSync(test.info().outputPath(`${scene}-none.png`), none);
                            writeFileSync(test.info().outputPath(`${scene}-old.png`), old);
                            writeFileSync(test.info().outputPath(`${scene}-new.png`), fresh);
                        }
                    }
                    console.log(`[edge ${dpr} ${preset} ${scheme}] ${report.length ? 'FAIL ' + report.join(' | ') : 'ok'}${confined.length ? ' · on the line only: ' + confined.join(', ') : ''}`);
                    expect(report, 'scenes where the new rule draws differently').toEqual([]);
                    expect(errors).toEqual([]);
                });
            }
        }
    });
}

test('the shipped Table stylesheet draws the line with exactly the rules compared above, and no sibling :has()', async ({ page }) => {
    await page.goto('/table-edge?preset=aura');
    await expect(page.locator('#d-default .p-datatable-tbody > tr').first()).toBeVisible();
    const { shipped, expected, siblingHas } = await page.evaluate((newRules) => {
        const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
        const collect = (list: CSSRuleList, out: string[]) => {
            for (const rule of Array.from(list)) {
                if ((rule instanceof CSSMediaRule || rule instanceof CSSStyleRule) && rule.cssText.includes('--agl-datatable-selected-edge')) out.push(norm(rule.cssText));
            }
        };
        const shipped: string[] = [];
        let siblingHas = 0;
        for (const sheet of Array.from(document.styleSheets)) {
            collect(sheet.cssRules, shipped);
            for (const rule of Array.from(sheet.cssRules)) if (rule instanceof CSSStyleRule && /:has\(\+/.test(rule.selectorText) && rule.selectorText.includes('p-datatable')) siblingHas++;
        }
        // Parse the expected texts the same way, so both sides are serialized by the browser.
        const probe = new CSSStyleSheet();
        probe.replaceSync(newRules.join('\n'));
        const expected: string[] = [];
        collect(probe.cssRules, expected);
        return { shipped, expected, siblingHas };
    }, NEW_RULES);
    expect(siblingHas, 'a sibling :has() rule on Table rows').toBe(0);
    expect(shipped.sort()).toEqual(expected.sort());
});
