import { writeFileSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { CONTRAST_ROWS } from '../apps/showcase/src/pages/contrast-rows';

/**
 * Text contrast of the severity colours (WCAG 1.4.3), in the stock preset and in the override the
 * Theming guide prints.
 *
 * The colours are not angulux's: they come from the preset package, and the library ships no preset
 * of its own (#143). What is ours is the page that tells a reader how to correct them, so this test
 * holds that page to its word. The override it measures (apps/verify/src/contrast-preset.ts) is the
 * very text the guide prints: apps/showcase/scripts/guide-snippets.mjs cuts it out of that file.
 *
 * Measured 2026-11-18. The guide used to print a shorter override, made on the primitive palette.
 * A primitive has no colour scheme, and the dark scheme uses the same palette steps as text on a
 * dark surface. So that override, while fixing light mode, took the dark success message from 5.92
 * to 3.05 over a card. The override printed now is scoped to the light scheme, and the last test
 * keeps the old one failing so the warning in the guide stays true.
 *
 * How a node is measured: its computed colour against the backgrounds of its ancestors, composited
 * from the page down, because several dark fills are translucent. 4.5:1 is required, 3:1 for large
 * text (24px, or 18.66px bold). Hover, focus and disabled states are not swept.
 *
 * The page is apps/verify/src/contrast.ts.
 */

type Preset = 'aura' | 'accessible' | 'primitive-shift';
type Under = 'content' | 'ground';
type Scheme = 'light' | 'dark';

interface Reading {
    /** The nearest library class above the text, e.g. `p-button-label`. */
    part: string;
    text: string;
    fg: string;
    bg: string;
    ratio: number;
    required: number;
}

interface Sweep {
    readings: Reading[];
    /** Text the sweep could not judge: under an opacity, or over a background image. */
    unreadable: string[];
}

async function sweep(page: Page, preset: Preset, under: Under, scheme: Scheme, testInfo: TestInfo): Promise<Sweep> {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`/contrast?preset=${preset}&under=${under}`);
    await page.locator('#show-toasts').click();
    await expect(page.locator('.p-toast-message')).toHaveCount(6);
    // Wait for the enter motion to end: a toast is measured at full opacity, where it comes to rest.
    await page.evaluate(() =>
        Promise.all(
            document
                .getAnimations()
                .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
                .map((a) => a.finished.catch(() => undefined))
        )
    );

    const result = await page.evaluate((): Sweep => {
        type Rgba = [number, number, number, number];

        const parse = (css: string): Rgba => {
            const legacy = css.match(/^rgba?\(([^)]+)\)$/);
            if (legacy) {
                const p = legacy[1].split(/[,\s/]+/).filter(Boolean).map(Number);
                return [p[0], p[1], p[2], p[3] ?? 1];
            }
            // What Chrome reports for a `color-mix()` fill.
            const srgb = css.match(/^color\(srgb ([^)]+)\)$/);
            if (srgb) {
                const p = srgb[1].split(/[\s/]+/).filter(Boolean).map(Number);
                return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1];
            }
            throw new Error(`unreadable colour: ${css}`);
        };
        const over = (top: Rgba, bottom: number[]): number[] => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3]));
        const channel = (c: number): number => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        const luminance = (c: number[]): number => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
        const hex = (c: number[]): string => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

        const readings: Reading[] = [];
        const unreadable: string[] = [];
        const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);

        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent!.trim();
            const parent = node.parentElement!;
            const owner = parent.closest('[class*="p-"]');
            if (!text || !owner || parent.closest('.p-hidden-accessible')) continue;
            const style = getComputedStyle(parent);
            if (parent.getClientRects().length === 0 || style.visibility === 'hidden') continue;

            const chain: Element[] = [];
            for (let el: Element | null = parent; el; el = el.parentElement) chain.unshift(el);

            let bg = [255, 255, 255];
            let judged = true;
            for (const el of chain) {
                const s = getComputedStyle(el);
                if (Number(s.opacity) < 1 || s.backgroundImage !== 'none') judged = false;
                bg = over(parse(s.backgroundColor), bg);
            }
            if (!judged) {
                unreadable.push(text);
                continue;
            }

            const fg = over(parse(style.color), bg);
            const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
            const size = parseFloat(style.fontSize);
            const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
            const part = [...owner.classList].find((c) => c.startsWith('p-'))!;

            readings.push({ part, text, fg: hex(fg), bg: hex(bg), ratio: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100, required: large ? 3 : 4.5 });
        }

        return { readings, unreadable };
    });

    // The whole table is kept as evidence, pass or fail: it is what the numbers in the guide come from.
    writeFileSync(testInfo.outputPath(`contrast-${preset}-${scheme}-${under}.json`), JSON.stringify(result, null, 2));

    // A sweep that read nothing would pass every assertion below.
    expect(result.readings.length, 'text nodes read').toBeGreaterThan(60);
    expect(result.unreadable, 'text the sweep could not judge').toEqual([]);

    return result;
}

const failing = (s: Sweep): Reading[] => s.readings.filter((r) => r.ratio < r.required);
const describe = (list: Reading[]): string => list.map((r) => `${r.ratio} ${r.part} "${r.text}" ${r.fg} on ${r.bg}`).join('\n');
/** The first node with that text: on the page, the filled variant comes before the outlined and the text one. */
const find = (s: Sweep, part: string, text: string): Reading => {
    const reading = s.readings.find((r) => r.part === part && r.text === text);
    if (!reading) throw new Error(`no reading for ${part} "${text}"`);
    return reading;
};

test('premise: the stock light preset puts white text on six fills that fall short of 4.5:1', async ({ page }, testInfo) => {
    const stock = await sweep(page, 'aura', 'content', 'light', testInfo);
    const pairs = new Set(failing(stock).map((r) => `${r.fg} on ${r.bg}`));
    // primary, success, info, warn, danger, help: the -500 step of each palette.
    for (const fill of ['#10b981', '#22c55e', '#0ea5e9', '#f97316', '#ef4444', '#a855f7']) {
        expect(pairs, describe(failing(stock))).toContain(`#ffffff on ${fill}`);
    }
});

for (const scheme of ['light', 'dark'] as const) {
    for (const under of ['content', 'ground'] as const) {
        test(`the override the guide prints leaves no text below its ratio: ${scheme}, over the ${under}`, async ({ page }, testInfo) => {
            const fixed = await sweep(page, 'accessible', under, scheme, testInfo);
            expect(describe(failing(fixed))).toBe('');
        });
    }
}

test('every ratio in the table the guide prints is the one measured here', async ({ page }, testInfo) => {
    for (const scheme of ['light', 'dark'] as const) {
        // Over the content surface: where a message sits when it is inside a card, and the worse of the two in dark.
        const stock = await sweep(page, 'aura', 'content', scheme, testInfo);
        const fixed = await sweep(page, 'accessible', 'content', scheme, testInfo);
        for (const row of CONTRAST_ROWS.filter((r) => r.scheme === scheme)) {
            expect(find(stock, row.part, row.text).ratio, `${row.where}, ${scheme}, stock`).toBe(row.stockRatio);
            expect(find(fixed, row.part, row.text).ratio, `${row.where}, ${scheme}, override`).toBe(row.overrideRatio);
            expect(row.stockRatio, `${row.where} is in the table because it falls short`).toBeLessThan(4.5);
        }
    }
});

test('premise: in the stock dark preset, the info and error messages fall short over a card', async ({ page }, testInfo) => {
    const stock = await sweep(page, 'aura', 'content', 'dark', testInfo);
    expect(find(stock, 'p-message-text', 'info message').ratio).toBeLessThan(4.5);
    expect(find(stock, 'p-message-text', 'error message').ratio).toBeLessThan(4.5);
    // And nothing else does: the override has a dark block for these two alone.
    expect([...new Set(failing(stock).map((r) => r.text.split(' ')[0]))].sort()).toEqual(['error', 'info']);
});

test('an override made on the primitive palette fixes the light fills and breaks dark mode', async ({ page }, testInfo) => {
    // Every number here is quoted in the guide, in the paragraph that warns against this override.
    const light = await sweep(page, 'primitive-shift', 'content', 'light', testInfo);
    expect(find(light, 'p-button-label', 'success').ratio).toBeGreaterThanOrEqual(4.5);
    // What it never reaches in light mode: neither of these reads a step it changes.
    expect(find(light, 'p-message-text', 'warn message').ratio).toBe(2.85);
    expect(find(light, 'p-togglebutton-label', 'No').ratio).toBe(4.34);

    const stock = await sweep(page, 'aura', 'content', 'dark', testInfo);
    const shifted = await sweep(page, 'primitive-shift', 'content', 'dark', testInfo);
    // The stock success message passes, so the first of these is a failure the override introduces.
    expect(find(stock, 'p-message-text', 'success message').ratio).toBe(5.92);
    expect(find(shifted, 'p-message-text', 'success message').ratio).toBe(3.05);
    expect(find(stock, 'p-message-text', 'error message').ratio).toBe(3.98);
    expect(find(shifted, 'p-message-text', 'error message').ratio).toBe(3.26);
});
