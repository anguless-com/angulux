import { expect, test, type Page } from '@playwright/test';

/**
 * The shape of Lux and of Lux Compact, measured: how tall a control is, how round its corners are,
 * how wide the focus ring is.
 *
 * WHY: Lux first differed from the preset it was derived from only in the colours that carry text
 * (e2e/contrast.spec.ts). It now has a shape of its own, and Lux Compact is that shape with less
 * padding. Both are described in numbers in the README of
 * packages/angulux-themes and on the Theming guide. This file is what those numbers are read from,
 * so a token changed without the prose changing turns the browser gate red.
 *
 * The first test is the premise: the upstream preset, on the same page, gives the numbers Lux is
 * described as differing from. Without it, "Lux is rounder" would pass on a page where nothing
 * rendered the way the reader's application does.
 *
 * HEIGHTS ARE COMPARED, NEVER STATED. The first version of this file required a field to be 36px
 * tall and passed on macOS. On the Linux runner the same field is 37px and a table row 49px
 * instead of 50px: a control's height is its padding plus one line of text, and the height of a
 * line is the font's, which is the platform's. What a preset decides is the padding, so the tests
 * compare two presets on the same page in the same browser. Radii and the focus ring are tokens
 * with no font in them, and those are stated in pixels.
 *
 * NOT COVERED: anything that floats (a dialog, the list of a select, a menu) is not on this page,
 * so their radius and shadow are not measured here. Nor is the dark scheme, whose shape tokens are
 * the same ones.
 *
 * The page is apps/verify/src/lux-shape.ts.
 */

interface Shape {
    button: number;
    input: number;
    select: number;
    row: number;
    fieldRadius: string;
    buttonRadius: string;
    cardRadius: string;
    cardShadow: string;
    messageRadius: string;
    checkboxRadius: string;
    fontSize: string;
    focusRing: string;
}

async function measure(page: Page, preset: 'aura' | 'lux' | 'compact'): Promise<Shape> {
    await page.goto(`/lux-shape?preset=${preset}`);
    await expect(page.locator('.p-datatable tbody tr')).toHaveCount(5);

    // Reached with the keyboard, because a focus ring is drawn for :focus-visible only.
    await page.locator('#name').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#probe-button button')).toBeFocused();

    return page.evaluate((): Shape => {
        const el = (selector: string): Element => {
            const found = document.querySelector(selector);
            if (!found) throw new Error(`nothing matches ${selector}`);
            return found;
        };
        const height = (selector: string): number => Math.round(el(selector).getBoundingClientRect().height * 10) / 10;
        const style = (selector: string): CSSStyleDeclaration => getComputedStyle(el(selector));

        return {
            button: height('#probe-button button'),
            input: height('#name'),
            select: height('.p-select'),
            row: height('.p-datatable tbody tr'),
            fieldRadius: style('#name').borderRadius,
            buttonRadius: style('#probe-button button').borderRadius,
            cardRadius: style('.p-card').borderRadius,
            cardShadow: style('.p-card').boxShadow,
            messageRadius: style('.p-message').borderRadius,
            checkboxRadius: style('.p-checkbox-box').borderRadius,
            fontSize: style('#name').fontSize,
            focusRing: style('#probe-button button').outlineWidth
        };
    });
}

test('premise: the upstream preset has 6px fields, a 1px focus ring and a card that casts a shadow', async ({ page }) => {
    const aura = await measure(page, 'aura');

    expect(aura.fieldRadius).toBe('6px');
    expect(aura.buttonRadius).toBe('6px');
    expect(aura.messageRadius).toBe('6px');
    expect(aura.checkboxRadius).toBe('4px');
    expect(aura.focusRing).toBe('1px');
    // Two offset shadows. Lux replaces them with one that has no offset and no blur, i.e. a border.
    expect(aura.cardShadow.split('rgba').length - 1).toBe(2);
    // A control is one line of text and its padding: taller than the 16px line, well short of two.
    for (const height of [aura.button, aura.input, aura.select]) {
        expect(height).toBeGreaterThan(30);
        expect(height).toBeLessThan(44);
    }
});

test('Lux is rounder and has a 2px focus ring, and is exactly as tall as the preset it came from', async ({ page }) => {
    const aura = await measure(page, 'aura');
    const lux = await measure(page, 'lux');

    expect(lux.fieldRadius).toBe('8px');
    expect(lux.buttonRadius).toBe('8px');
    expect(lux.messageRadius).toBe('8px');
    expect(lux.checkboxRadius).toBe('5px');
    expect(lux.cardRadius).toBe('12px');
    expect(lux.focusRing).toBe('2px');
    // A 1px line all round, drawn as a shadow: no offset, no blur, 1px of spread.
    expect(lux.cardShadow).toMatch(/0px 0px 0px 1px$/);
    // Density is unchanged: an application that moves to Lux keeps its layout.
    expect([lux.button, lux.input, lux.select, lux.row]).toEqual([aura.button, aura.input, aura.select, aura.row]);
    expect(lux.fontSize).toBe('16px');
});

test('Lux Compact makes a control 4px shorter and a table row 8px shorter than Lux, and nothing else differs', async ({ page }) => {
    const lux = await measure(page, 'lux');
    const compact = await measure(page, 'compact');

    // 2px less padding above and below a field, 4px less above and below a table cell.
    expect(lux.button - compact.button).toBeCloseTo(4, 1);
    expect(lux.input - compact.input).toBeCloseTo(4, 1);
    expect(lux.select - compact.select).toBeCloseTo(4, 1);
    expect(lux.row - compact.row).toBeCloseTo(8, 1);

    // Everything that is not a height is Lux's, read off the same page.
    const withoutHeights = (shape: Shape): Shape => ({ ...shape, button: 0, input: 0, select: 0, row: 0 });
    expect(withoutHeights(compact)).toEqual(withoutHeights(lux));
});
