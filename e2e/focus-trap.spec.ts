import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';

/**
 * FocusTrap, driven with the real Tab key. The page is apps/verify/src/focus-trap.ts: a button,
 * the trap (two fields and a Submit button), then two more buttons, the last of which turns the
 * trap off and on.
 *
 * The trap works by placing a focusable element at each end of its host. Tab past the last
 * control lands on the end one, which sends focus back to the first control; Shift+Tab past the
 * first lands on the start one, which sends it to the last. These tests pin that behaviour from
 * the outside, by where focus is after each key, so they hold whatever the edges are made of.
 * Focus must never stay on an edge itself: a screen reader would land on nothing.
 */

/** Where focus is: the id of the focused element or its nearest ancestor with one, or "edge". */
async function focused(page: Page): Promise<string> {
    return page.evaluate(() => {
        const element = document.activeElement;

        if (!element || element === document.body) return 'body';
        if (element.hasAttribute('data-p-hidden-focusable')) return 'edge';

        return element.closest('[id]')?.id ?? element.tagName;
    });
}

async function press(page: Page, key: string, times = 1): Promise<string[]> {
    const path: string[] = [];

    for (let i = 0; i < times; i++) {
        await page.keyboard.press(key);
        path.push(await focused(page));
    }

    return path;
}

test.beforeEach(async ({ page }) => {
    await page.goto('/focus-trap');
    await expect(page.locator('#submit button')).toBeVisible();
});

test('the trap takes no focus on its own, and Tab from the button before it enters at the first field', async ({ page }) => {
    expect(await focused(page), 'focus after the page loads').toBe('body');

    await page.locator('#before').focus();

    expect(await press(page, 'Tab', 3), 'focus after each Tab from the button before the trap').toEqual(['first', 'second', 'submit']);
});

test('Tab on the last control goes back to the first, and Shift+Tab on the first goes to the last', async ({ page }) => {
    await page.locator('#submit button').focus();

    expect(await press(page, 'Tab', 7), 'two laps of Tab from Submit').toEqual(['first', 'second', 'submit', 'first', 'second', 'submit', 'first']);
    expect(await press(page, 'Shift+Tab', 7), 'two laps of Shift+Tab from the first field').toEqual(['submit', 'second', 'first', 'submit', 'second', 'first', 'submit']);
});

test('Shift+Tab from the button after the trap enters at the last control', async ({ page }) => {
    await page.locator('#after').focus();

    expect(await press(page, 'Shift+Tab', 3), 'focus after each Shift+Tab from the button after the trap').toEqual(['submit', 'second', 'first']);
});

test('the trap holds the Tab key only: a click outside takes focus out, and Tab goes on from there', async ({ page }) => {
    await page.locator('#second').focus();
    await page.locator('#after').click();

    expect(await focused(page), 'focus after clicking the button after the trap').toBe('after');
    expect(await press(page, 'Tab'), 'Tab from there').toEqual(['toggle']);
    expect(await press(page, 'Shift+Tab', 2), 'Shift+Tab back into the trap').toEqual(['after', 'submit']);
});

test('turned off, Tab leaves at either end; turned back on, it holds again', async ({ page }) => {
    await page.locator('#toggle').click();
    await expect(page.locator('#toggle')).toHaveText('Turn the trap on');

    await page.locator('#submit button').focus();
    expect(await press(page, 'Tab'), 'Tab from Submit with the trap off').toEqual(['after']);

    await page.locator('#first').focus();
    expect(await press(page, 'Shift+Tab'), 'Shift+Tab from the first field with the trap off').toEqual(['before']);

    await page.locator('#toggle').click();
    await expect(page.locator('#toggle')).toHaveText('Turn the trap off');

    await page.locator('#submit button').focus();
    expect(await press(page, 'Tab'), 'Tab from Submit with the trap on again').toEqual(['first']);

    await page.locator('#first').focus();
    expect(await press(page, 'Shift+Tab'), 'Shift+Tab from the first field with the trap on again').toEqual(['submit']);
});

test('to a screen reader the trap is its three controls and nothing else', async ({ page }) => {
    expect(await page.locator('#trap').ariaSnapshot(), 'the accessibility tree inside the trap').toBe(['- textbox "First"', '- textbox "Second"', '- button "Submit"'].join('\n'));
});

test('nothing in the trap that takes focus is hidden from assistive technology', async ({ page }) => {
    // The edges used to be aria-hidden while taking focus: axe aria-hidden-focus, two elements.
    expect(await page.locator('#trap [data-p-hidden-focusable]').count(), 'the edges are there to be checked').toBe(2);

    const result = await new AxeBuilder({ page }).include('#trap').withRules(['aria-hidden-focus']).analyze();

    expect(result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`))).toEqual([]);
});
