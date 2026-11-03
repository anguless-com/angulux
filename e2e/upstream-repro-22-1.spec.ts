import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Upstream reproduction probes, second batch (#168): the PrimeNG 22.1.1 to 22.1.4 changelog
 * entries that name a module angulux ships, other than Select.
 *
 * Same contract as upstream-repro.spec.ts, whose header explains it in full:
 *
 *   - A failure here is a FINDING, not a regression. Each test answers whether a defect
 *     reported upstream is also present in the code we inherited from 21.1.9.
 *   - Only the published SENTENCE is taken from upstream. Every scenario below was written from
 *     OUR source and measured in Chrome before it was written down (Constitution P1).
 *   - An entry that reproduces is held with `test.fail()`, holding ONE assertion: the defect.
 *     Its scene is set and asserted by an ordinary test beside it, so a broken scene cannot
 *     turn into a false green inside the inverted verdict. When the defect is fixed, the held
 *     test fails as an unexpected pass and has to be converted on purpose.
 *   - An entry that does not reproduce stays as an ordinary passing test. It is now the thing
 *     that would notice a regression, and the only evidence the question was asked.
 *
 * MEASURED 2026-11-02, 19 entries: 12 reproduce, 7 do not. The verdict and the mechanism of
 * each are in tools/upstream/seen.json under the digest named on its test. Fixed since: the
 * 12-hour hour buttons, the typed timeOnly time and aria-disabled (2026-11-03).
 *
 * The probe page is apps/verify/src/upstream-22-1.ts, one scenario per `?case=`.
 */

/** A silent runtime error is still a failure — same rule as the mandatory gate. */
function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    return errors;
}

async function open(page: Page, kase: string): Promise<void> {
    await page.goto(`/upstream-22-1?case=${kase}`);
    await expect(page.locator(`#sec-${kase}`)).toBeVisible();
}

/** The element that has focus, described well enough to tell a day cell from a button from <body>. */
function activeElement(page: Page): Promise<{ tag: string; date: string | null; inside: string | null; next: boolean }> {
    return page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        return {
            tag: a?.tagName ?? 'NONE',
            date: a?.getAttribute('data-date') ?? null,
            inside: a?.closest('[id]')?.id ?? null,
            next: !!a?.classList.contains('p-datepicker-next-button')
        };
    });
}

// ═══ DatePicker ════════════════════════════════════════════════════════════════════════════

/** 22.1.4 · DatePicker · 769fb13bdf0f. The month is March 2026, days before the 10th and every weekend unselectable. */
test('upstream 22.1.4 · DatePicker — the scene: unselectable days are rendered as disabled', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dp-aria');
    // 9 March is before the minimum, 14 March a Saturday, 18 March selectable. data-date months are 0-based.
    await expect(page.locator('.p-datepicker-day[data-date="2026-2-9"]')).toHaveClass(/p-disabled/);
    await expect(page.locator('.p-datepicker-day[data-date="2026-2-14"]')).toHaveClass(/p-disabled/);
    await expect(page.locator('.p-datepicker-day[data-date="2026-2-18"]')).not.toHaveClass(/p-disabled/);
    expect(errors).toEqual([]);
});

test('upstream 22.1.4 · DatePicker — an unselectable day says so to assistive technology', async ({ page }) => {
    // FIXED 2026-11-03 under Constitution P3.a; held with test.fail() until then. Measured
    // before: 19 day cells carried p-disabled and no element in the picker carried
    // aria-disabled. The day span now carries it whenever it carries p-disabled.
    await open(page, 'dp-aria');
    await expect(page.locator('.p-datepicker-day[data-date="2026-2-9"]')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('.p-datepicker-day[data-date="2026-2-14"]')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('.p-datepicker-day[data-date="2026-2-18"]')).not.toHaveAttribute('aria-disabled', /.*/);
    expect(await page.locator('.p-datepicker-day.p-disabled:not([aria-disabled="true"])').count()).toBe(0);
});

/** 22.1.4 · DatePicker · 2c0b4d9bb30d. */
test('upstream 22.1.4 · DatePicker — the scene: in the popup, arrow keys carry focus into the next month', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dp-nav');
    await page.locator('#dp-nav-popup-input').click();
    const start = page.locator('#dp-nav-popup span[data-date="2026-2-1"]');
    await expect(start).toBeVisible();
    // The popup moves focus to a cell of its own once it has opened; take it back only after that.
    await page.waitForTimeout(300);
    await start.focus();
    await expect.poll(async () => (await activeElement(page)).date).toBe('2026-2-1');
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await activeElement(page)).date).toBe('2026-1-28');
    // And the inline picker's next button is reachable and moves the month.
    const inline = page.locator('#dp-nav-inline');
    await inline.locator('button.p-datepicker-next-button').focus();
    await page.keyboard.press('Enter');
    await expect(inline.locator('.p-datepicker-title')).toContainText('April');
    expect(errors).toEqual([]);
});

test('upstream 22.1.4 · DatePicker — focus must stay in an inline picker after the keyboard changes the month', async ({ page }) => {
    // REPRODUCES, in the inline picker only. Enter on the next-month button moves the month and
    // drops focus on <body>: the header the button sat in is rebuilt with the month. The popup
    // restores focus after a month change; the inline picker does not. (The inline day grid has
    // no tabindex=0 cell either, so Tab never reaches a day; that is noted in seen.json.)
    test.fail();
    await open(page, 'dp-nav');
    const inline = page.locator('#dp-nav-inline');
    await inline.locator('button.p-datepicker-next-button').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect((await activeElement(page)).inside).toBe('dp-nav-inline');
});

/** 22.1.3 · DatePicker · 05c817919d3e. */
test('upstream 22.1.3 · DatePicker — the scene: in timeOnly, the hour button keeps the date of the value', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dp-timeonly');
    await expect(page.locator('#probe-dp-timeonly')).toHaveText('2020-01-15 10:00');
    await page.locator('#dp-timeonly-input').click();
    await page.locator('#dp-timeonly-popup .p-datepicker-hour-picker button.p-datepicker-increment-button').click();
    await expect(page.locator('#probe-dp-timeonly')).toHaveText('2020-01-15 11:00');
    // A second candidate read from the source, measured and NOT reproduced: a 12-hour timeOnly
    // picker with no value shows the current hour, not 00.
    await expect(page.locator('#dp-timeonly-12 .p-datepicker-hour-picker > span')).toHaveText(/^(0[1-9]|1[0-2])$/);
    expect(errors).toEqual([]);
});

test('upstream 22.1.3 · DatePicker — a time typed into timeOnly keeps the date of the value', async ({ page }) => {
    // FIXED 2026-11-03 under Constitution P3.a; held with test.fail() until then. Typing 11:30
    // over 2020-01-15 10:00 produced TODAY at 11:30, because parseDateTime() built a typed time
    // on new Date() when timeOnly was set. It now builds it on the bound value, as the hour
    // button above always did.
    await open(page, 'dp-timeonly');
    await page.locator('#dp-timeonly-input').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('11:30');
    await expect(page.locator('#probe-dp-timeonly')).toHaveText('2020-01-15 11:30');
});

/**
 * 22.1.2 · DatePicker · a01f058bf31d. Every picker is 12-hour, inline, on 15 March 2026.
 *
 * Returns the value once it has stopped changing. Polling for the expected text instead would
 * be satisfied by a value the probe shows on its way somewhere else — the first of two clicks
 * lands on exactly the maximum the second one overshoots, and a correct clamp below the minimum
 * keeps the value it started with.
 */
async function stepHour(page: Page, id: string, which: 'increment' | 'decrement', times: number): Promise<string> {
    const box = page.locator(`#dp-hour-${id}`);
    const probe = page.locator(`#probe-dp-hour-${id}`);
    for (let i = 0; i < times; i++) {
        await box.locator(`.p-datepicker-hour-picker button.p-datepicker-${which}-button`).click();
        await page.waitForTimeout(250);
    }
    let last = await probe.textContent();
    for (;;) {
        await page.waitForTimeout(250);
        const now = await probe.textContent();
        if (now === last) return now ?? '';
        last = now;
    }
}

test('upstream 22.1.2 · DatePicker — the scene: with no bound in reach, the 12-hour buttons step through noon', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dp-hour');
    await expect(page.locator('#probe-dp-hour-plain')).toHaveText('2026-03-15 11:00');
    expect(await stepHour(page, 'plain', 'increment', 1)).toBe('2026-03-15 12:00');
    expect(await stepHour(page, 'plain', 'increment', 1)).toBe('2026-03-15 13:00');
    expect(await stepHour(page, 'plain', 'decrement', 2)).toBe('2026-03-15 11:00');
    // And every held picker below starts where its scenario says, so a held test fails on the step.
    await expect(page.locator('#probe-dp-hour-max')).toHaveText('2026-03-15 16:00');
    await expect(page.locator('#probe-dp-hour-min')).toHaveText('2026-03-15 13:45');
    await expect(page.locator('#probe-dp-hour-step')).toHaveText('2026-03-15 13:00');
    await expect(page.locator('#probe-dp-hour-noon')).toHaveText('2026-03-15 11:00');
    expect(errors).toEqual([]);
});

// FIXED 2026-11-03 under Constitution P3.a. The four tests below were held with test.fail() from
// 2026-11-02 until then. The step and the clamp now run on a 24-hour clock and only the result is
// turned back into a 12-hour hour, so each lands where the same picker on a 24-hour clock lands
// (asserted in datepicker.spec.ts). Measured before the fix: "17 PM" and 05:00 the next day;
// "13 PM" and 01:30 the next day; 11 PM; 11:30 PM.

test('upstream 22.1.2 · DatePicker — stepping the hour into maxDate stops at maxDate', async ({ page }) => {
    await open(page, 'dp-hour');
    expect(await stepHour(page, 'max', 'increment', 2)).toBe('2026-03-15 17:00');
    await expect(page.locator('#dp-hour-max .p-datepicker-hour-picker > span')).toHaveText('05');
    await expect(page.locator('#dp-hour-max .p-datepicker-ampm-picker > span')).toHaveText('PM');
});

test('upstream 22.1.2 · DatePicker — stepping the hour below minDate stops at minDate', async ({ page }) => {
    // The minimum itself, minutes included, as the 24-hour picker has always clamped it.
    await open(page, 'dp-hour');
    expect(await stepHour(page, 'min', 'decrement', 1)).toBe('2026-03-15 13:30');
    await expect(page.locator('#dp-hour-min .p-datepicker-hour-picker > span')).toHaveText('01');
});

test('upstream 22.1.2 · DatePicker — a two-hour step back from 1 PM lands on 11 AM', async ({ page }) => {
    await open(page, 'dp-hour');
    expect(await stepHour(page, 'step', 'decrement', 1)).toBe('2026-03-15 11:00');
    await expect(page.locator('#dp-hour-step .p-datepicker-ampm-picker > span')).toHaveText('AM');
});

test('upstream 22.1.2 · DatePicker — an increment past noon that maxDate forbids stays at maxDate in the morning', async ({ page }) => {
    await open(page, 'dp-hour');
    expect(await stepHour(page, 'noon', 'increment', 1)).toBe('2026-03-15 11:30');
    await expect(page.locator('#dp-hour-noon .p-datepicker-ampm-picker > span')).toHaveText('AM');
});

/** 22.1.1 · DatePicker · 1843658c4d5a. */
test('upstream 22.1.1 · DatePicker — the scene: picking a day writes the value and leaves the control valid', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dp-touched');
    await page.locator('#dp-touched-input').click();
    const day = page.locator('.p-datepicker-panel .p-datepicker-day:not(.p-disabled)').nth(10);
    await expect(day).toBeVisible();
    expect(await day.boundingBox()).not.toBeNull();
    await day.click();
    await expect(page.locator('#probe-dp-touched')).toContainText('value:');
    await expect(page.locator('#dp-touched-error')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('upstream 22.1.1 · DatePicker — a required control must not show its error while a day is being picked', async ({ page }) => {
    // REPRODUCES. Pressing the mouse on a day blurs the input, which marks the control touched
    // while it is still empty: the error appears, and goes away when the click lands and the
    // value is written. From the keyboard it is worse — ArrowDown moves focus into the grid and
    // the error stays up for as long as the user is choosing.
    test.fail();
    await open(page, 'dp-touched');
    await page.locator('#dp-touched-input').click();
    const day = page.locator('.p-datepicker-panel .p-datepicker-day:not(.p-disabled)').nth(10);
    await day.waitFor({ state: 'visible' });
    const box = (await day.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Read once, after the blur has had time to land. Polling for "no error" would pass on its
    // first look whenever the error had not rendered YET, which on a slow runner is a false pass.
    await page.waitForTimeout(500);
    expect(await page.locator('#dp-touched-error').count()).toBe(0);
});

// ═══ Drawer, Overlay, ConfirmDialog, Dialog, Toast ═════════════════════════════════════════

/** 22.1.4 · Drawer · 717c3af903be. */
test('upstream 22.1.4 · Drawer — the scene: a modal drawer opens with its mask in the light DOM, and opens in a shadow root', async ({ page }) => {
    await open(page, 'drawer-shadow');
    const errors = watchErrors(page);
    await page.locator('#drawer-light-open').click();
    await expect(page.locator('.p-drawer-mask')).toHaveCount(1);
    expect(errors).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('.p-drawer-mask')).toHaveCount(0);

    await page.locator('#drawer-shadow-open').click();
    await expect(page.locator('#drawer-shadow-host .p-drawer')).toHaveAttribute('data-p-open', 'true');
});

test('upstream 22.1.4 · Drawer — a modal drawer inside a shadow root must open with its mask and without an error', async ({ page }) => {
    // REPRODUCES, exactly as stated. enableModality() counts open drawers with
    // document.querySelectorAll, which does not see into a shadow root; with zero found it reads
    // .style of the entry at index -1 and throws a TypeError before the mask is created.
    test.fail();
    await open(page, 'drawer-shadow');
    const errors = watchErrors(page);
    await page.locator('#drawer-shadow-open').click();
    // The panel opens either way; the error and the mask are what differ.
    await expect(page.locator('#drawer-shadow-host .p-drawer')).toHaveAttribute('data-p-open', 'true');
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
    await expect(page.locator('.p-drawer-mask')).toHaveCount(1, { timeout: 500 });
});

/** 22.1.3 · Overlay · d1ba5cd100ac. The leave phase is stretched so the window is easy to hit. */
test('upstream 22.1.3 · Overlay — the scene: a select panel opens and a click on an option selects it', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'overlay-closing');
    await page.locator('#sec-overlay-closing > agl-select').click();
    await expect(page.locator('.p-select-option').nth(1)).toBeVisible();
    expect(await page.locator('.p-select-option').nth(1).boundingBox()).not.toBeNull();
    await page.locator('.p-select-option').nth(0).click();
    await expect(page.locator('#probe-overlay-closing')).toHaveText('HN');
    expect(errors).toEqual([]);
});

test('upstream 22.1.3 · Overlay — a panel that is closing must not take a click', async ({ page }) => {
    // REPRODUCES. After an option is picked the panel stays in place through its leave phase
    // with pointer-events auto, so the next click lands on it: hovering focuses an option and a
    // click selects it. Measured at the DEFAULT timing too — a select panel stays hit-testable
    // for about 320 ms after the selecting click, which a quick second click reaches.
    test.fail();
    await open(page, 'overlay-closing');
    await page.locator('#sec-overlay-closing > agl-select').click();
    await page.locator('.p-select-option').nth(1).waitFor({ state: 'visible' });
    const second = (await page.locator('.p-select-option').nth(1).boundingBox())!;
    await page.locator('.p-select-option').nth(0).click();
    await page.mouse.click(second.x + second.width / 2, second.y + second.height / 2);
    await page.waitForTimeout(1800);
    await expect(page.locator('#probe-overlay-closing')).toHaveText('HN', { timeout: 500 });
});

/** 22.1.2 · ConfirmDialog · fa30946dc213. Does NOT reproduce. */
test('upstream 22.1.2 · ConfirmDialog — acceptIcon and rejectIcon render on the buttons, as inputs and on the confirmation', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'confirm-icons');
    for (const trigger of ['#confirm-inputs-open', '#confirm-object-open']) {
        await page.locator(trigger).click();
        const dialog = page.locator('.p-confirmdialog');
        await expect(dialog.locator('.p-confirmdialog-accept-button i.pi-check')).toHaveCount(1);
        await expect(dialog.locator('.p-confirmdialog-reject-button i.pi-times')).toHaveCount(1);
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
    }
    expect(errors).toEqual([]);
});

/** 22.1.1 · Dialog · fa3ac51daa10. */
test("upstream 22.1.1 · Dialog — the scene: appendTo body puts the dialog's mask under body", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'dialog-append');
    await page.locator('#dialog-body-open').click();
    await expect(page.locator('.dialog-to-body')).toBeVisible();
    expect(await page.locator('.dialog-to-body').evaluate((d) => d.parentElement?.parentElement === document.body)).toBe(true);
    expect(errors).toEqual([]);
});

test('upstream 22.1.1 · Dialog — appendTo an element must put the dialog inside that element', async ({ page }) => {
    // REPRODUCES. Any appendTo other than 'self' appends the wrapper to document.body, so an
    // element target is ignored — while the input's own documentation names "a local
    // ng-template variable of another element" as a valid value.
    test.fail();
    await open(page, 'dialog-append');
    await page.locator('#dialog-append-open').click();
    await expect(page.locator('.dialog-to-element')).toBeVisible();
    expect(await page.locator('.dialog-to-element').evaluate((d) => !!d.closest('#dialog-append-target'))).toBe(true);
});

/** 22.1.3 · Toast · ddf710dbc96a. Does NOT reproduce: angulux has no swipe-to-dismiss. */
test('upstream 22.1.3 · Toast — a swipe dismisses nothing, and closing a message removes that message', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'toast');
    await page.locator('#toast-add').click();
    const summaries = page.locator('.p-toast-message .p-toast-summary');
    await expect(summaries).toHaveText(['first', 'second', 'third']);

    // A real touch swipe across the second message. There is no touch handler in toast.ts to
    // dismiss it, so there is no half-dismissed state to leave behind either.
    const box = (await page.locator('.p-toast-message').nth(1).boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width / 2 + i * 30, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
    await expect(summaries).toHaveText(['first', 'second', 'third']);

    await page.locator('.p-toast-message').nth(1).locator('.p-toast-close-button').click();
    await expect(summaries).toHaveText(['first', 'third']);
    await page.locator('.p-toast-message').nth(0).locator('.p-toast-close-button').click();
    await expect(summaries).toHaveText(['third']);
    expect(errors).toEqual([]);
});

// ═══ Menu, MultiSelect ═════════════════════════════════════════════════════════════════════

/** 22.1.1 · Menu · 621fd8489601. */
test('upstream 22.1.1 · Menu — the scene: arrow keys move through items with and without a custom template, and Enter runs a plain item', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'menu-template');
    for (const id of ['menu-plain', 'menu-template']) {
        await page.locator(`#${id} ul.p-menu-list`).focus();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await expect(page.locator(`#${id} li.p-focus`)).toHaveAttribute('id', 'menu-delete');
    }
    await page.locator('#menu-plain ul.p-menu-list').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('#probe-menu-template')).toHaveText('delete');
    expect(errors).toEqual([]);
});

test('upstream 22.1.1 · Menu — Enter must run an item drawn by a custom template', async ({ page }) => {
    // REPRODUCES, in part. Navigation works; activation does not. onEnterKey() looks for a link
    // or a button inside the item and otherwise clicks the <li>, but the item's click handler
    // sits on the content element INSIDE the <li>, which a click on the <li> never reaches. A
    // template drawing a plain <span> therefore leaves Enter and Space doing nothing.
    test.fail();
    await open(page, 'menu-template');
    await page.locator('#menu-template ul.p-menu-list').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('#probe-menu-template')).toHaveText('delete', { timeout: 1000 });
});

/** 22.1.3 · MultiSelect · dca7c6429b5f. */
test('upstream 22.1.3 · MultiSelect — the scene: the header checkbox selects all and unselects all, and keeps a disabled selection', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'ms-selectall');
    const cases: [string, string, string][] = [
        ['ms-plain', 'HN,DN,HUE,HCM', 'empty'],
        ['ms-disabled', 'HUE,HN,DN,HCM', 'HUE']
    ];
    for (const [id, all, none] of cases) {
        await page.locator(`#${id} .p-multiselect`).click();
        const header = page.locator('.p-multiselect-overlay .p-multiselect-header .p-checkbox');
        await header.click();
        await expect(page.locator(`#probe-${id}`)).toHaveText(all);
        await header.click();
        await expect(page.locator(`#probe-${id}`)).toHaveText(none);
        await page.keyboard.press('Escape');
        await expect(page.locator('.p-multiselect-overlay')).toHaveCount(0);
    }
    // And the variant held below does select all.
    await page.locator('#ms-unset .p-multiselect').click();
    await page.locator('.p-multiselect-overlay .p-multiselect-header .p-checkbox').click();
    await expect(page.locator('#probe-ms-unset')).toHaveText('HN,DN,HUE,HCM');
    expect(errors).toEqual([]);
});

test('upstream 22.1.3 · MultiSelect — with selectAll bound to a field never assigned, the header checkbox must unselect all', async ({ page }) => {
    // REPRODUCES. onToggleAll() tests `selectAll != null` and allSelected() tests
    // `selectAll !== null`. Bound to undefined, the first treats the box as uncontrolled and the
    // second returns undefined, so every click takes the select-all branch: the second click
    // re-selects everything and the checkbox shows unchecked over four selected options.
    test.fail();
    await open(page, 'ms-selectall');
    await page.locator('#ms-unset .p-multiselect').click();
    const header = page.locator('.p-multiselect-overlay .p-multiselect-header .p-checkbox');
    await header.click();
    await expect(page.locator('#probe-ms-unset')).toHaveText('HN,DN,HUE,HCM');
    await header.click();
    await expect(page.locator('#probe-ms-unset')).toHaveText('empty', { timeout: 1000 });
});

// ═══ Table, TreeTable ══════════════════════════════════════════════════════════════════════

/** 22.1.4 · Table · 096a73ca9524. */
async function sortOnPageThree(page: Page, variant: 'plain' | 'filtered'): Promise<Locator> {
    const box = page.locator(`#sort-page-${variant}`);
    await box.locator('.p-paginator-page').nth(2).click();
    await expect(box.locator('.p-paginator-page-selected')).toHaveText('3');
    await box.locator('th.p-datatable-sortable-column').first().click();
    await expect(box.locator('th.p-datatable-sortable-column').first()).toHaveAttribute('aria-sort', 'ascending');
    return box.locator('.p-paginator-page-selected');
}

test('upstream 22.1.4 · Table — the scene: resetPageOnSort false keeps the page on sort when no column filter is declared', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'table-sort-page');
    await expect(await sortOnPageThree(page, 'plain')).toHaveText('3');
    expect(errors).toEqual([]);
});

test('upstream 22.1.4 · Table — resetPageOnSort false must keep the page on sort when a column filter is declared', async ({ page }) => {
    // REPRODUCES, with a column filter only. A <agl-columnFilter> registers an empty constraint
    // when it starts, so hasFilter() is true from then on; sortSingle() then runs _filter(),
    // which sets first = 0 without reading resetPageOnSort. Page 3 becomes page 1.
    test.fail();
    await open(page, 'table-sort-page');
    await expect(await sortOnPageThree(page, 'filtered')).toHaveText('3', { timeout: 1000 });
});

/** 22.1.3 · Table · 808f9fd0181d. Does NOT reproduce. */
test('upstream 22.1.3 · Table — the sort indicator renders unsorted, on an initial sort, and after a click', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'table-sort-icon');
    const icon = (box: string, nth: number) => page.locator(`#sort-icon-${box} th`).nth(nth).locator('svg');
    await expect(icon('unsorted', 0)).toHaveAttribute('data-p-icon', 'sort-alt');
    await expect(icon('binding', 0)).toHaveAttribute('data-p-icon', 'sort-amount-down');
    await expect(icon('binding', 1)).toHaveAttribute('data-p-icon', 'sort-alt');
    await page.locator('#sort-icon-unsorted th').first().click();
    await expect(icon('unsorted', 0)).toHaveAttribute('data-p-icon', 'sort-amount-up-alt');
    expect(errors).toEqual([]);
});

/** 22.1.1 · Table · 9b82eeae3e1b. Does NOT reproduce. */
test('upstream 22.1.1 · Table — the record count returns after a column filter is cleared, from the menu and from a row filter', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'table-filter-total');

    const menu = page.locator('#filter-total-menu');
    await menu.locator('.p-datatable-column-filter-button').click();
    const overlay = page.locator('.p-datatable-filter-buttonbar').locator('..');
    await overlay.locator('input[type="text"]').first().fill('Row 0');
    await page.locator('.p-datatable-filter-buttonbar button').last().click();
    await expect(page.locator('#probe-filter-total-menu')).toHaveText('2');
    // The overlay leaves before it is reopened, or the Clear button found is the departing one.
    await expect(page.locator('.p-datatable-filter-buttonbar')).toHaveCount(0);
    await menu.locator('.p-datatable-column-filter-button').click();
    await page.locator('.p-datatable-filter-buttonbar button').first().click();
    await expect(page.locator('#probe-filter-total-menu')).toHaveText('20');
    await expect(menu.locator('.p-paginator-current')).toHaveText('total=20');

    const row = page.locator('#filter-total-row');
    await row.locator('thead input').click();
    await page.keyboard.type('Row 0');
    await page.keyboard.press('Enter');
    await expect(page.locator('#probe-filter-total-row')).toHaveText('2');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    await expect(page.locator('#probe-filter-total-row')).toHaveText('20');
    expect(errors).toEqual([]);
});

/** 22.1.1 · Table · 9155687471bf. Does NOT reproduce. */
test('upstream 22.1.1 · Table — a lazy, stateful table renders its columns, before and after its state is restored', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'table-lazy-state');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    const shape = (variant: string) =>
        page.evaluate((v) => {
            const box = document.querySelector(`#lazy-${v}`)!;
            return `th=${box.querySelectorAll('thead th').length} td=${box.querySelector('tbody tr')?.querySelectorAll('td').length ?? 0}`;
        }, variant);
    for (const v of ['stateless', 'stateful', 'reorder']) await expect.poll(() => shape(v)).toBe('th=2 td=2');

    // Saving state needs an interaction; the reorderable variant also saves its column order.
    await page.locator('#lazy-reorder .p-paginator-page').nth(1).click();
    await page.locator('#lazy-stateful .p-paginator-page').nth(1).click();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('agl-upstream-lazy-reorder'))).toContain('"columnOrder":["id","name"]');
    await page.reload();
    for (const v of ['stateless', 'stateful', 'reorder']) await expect.poll(() => shape(v)).toBe('th=2 td=2');
    expect(errors).toEqual([]);
});

/** 22.1.4 · Table · 5b2f43899b05. Does NOT reproduce. */
test('upstream 22.1.4 · Table — the virtual scroller keeps the rows that stay in view, on a scroll and on a resize', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'table-virtual');
    await expect(page.locator('#sec-table-virtual tbody tr').first()).toBeVisible();
    const result = await page.evaluate(async () => {
        const tbody = document.querySelector('#sec-table-virtual tbody')!;
        const scroller = document.querySelector('#sec-table-virtual .p-virtualscroller')!;
        const before = new Map([...tbody.querySelectorAll('tr')].map((tr) => [tr.getAttribute('data-id'), tr]));
        scroller.scrollTop += 200;
        await new Promise((r) => setTimeout(r, 300));
        const after = [...tbody.querySelectorAll('tr')];
        const stayed = after.filter((tr) => before.has(tr.getAttribute('data-id')));
        return { stayed: stayed.length, sameNode: stayed.filter((tr) => before.get(tr.getAttribute('data-id')) === tr).length, rendered: after.length };
    });
    // Five 40 px rows scroll out; every row still in view must be the same element.
    expect(result.stayed).toBeGreaterThan(10);
    expect(result.sameNode).toBe(result.stayed);

    await page.evaluate(() => {
        const w = window as unknown as { __rows: Map<string | null, Element> };
        w.__rows = new Map([...document.querySelectorAll('#sec-table-virtual tbody tr')].map((tr) => [tr.getAttribute('data-id'), tr]));
    });
    await page.setViewportSize({ width: 900, height: 600 });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);
    const kept = await page.evaluate(() => {
        const w = window as unknown as { __rows: Map<string | null, Element> };
        return [...document.querySelectorAll('#sec-table-virtual tbody tr')].every((tr) => w.__rows.get(tr.getAttribute('data-id')) === tr);
    });
    expect(kept).toBe(true);
    expect(errors).toEqual([]);
});

/**
 * 22.1.3 · Table · ec1148b1cfc0 and 22.1.3 · TreeTable · 5188ee327f1f.
 *
 * The rows of a body that a stylesheet selects through `:has()` with a sibling combinator. Timing
 * is measured once and written down in seen.json; the gate asserts the MECHANISM, which a slow CI
 * runner cannot make flaky.
 */
function siblingHasRules(page: Page, body: string): Promise<string[]> {
    return page.evaluate((cls) => {
        const out: string[] = [];
        const walk = (rules: CSSRuleList) => {
            for (const rule of Array.from(rules)) {
                const r = rule as CSSStyleRule & { cssRules?: CSSRuleList };
                if (r.selectorText === undefined && r.cssRules) walk(r.cssRules);
                else if (r.selectorText?.includes(cls) && /:has\(\s*[+~]/.test(r.selectorText)) out.push(r.selectorText);
            }
        };
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                walk(sheet.cssRules);
            } catch {
                /* a cross-origin sheet cannot be read, and none of ours is one */
            }
        }
        return out;
    }, body);
}

test('upstream 22.1.3 · Table — the scene: 2,000 rows render, and the table stylesheet is loaded', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'table-perf');
    await page.evaluate(() => (window as unknown as { __aglRenderRows: (n: number) => number }).__aglRenderRows(2000));
    await expect(page.locator('#sec-table-perf tbody tr')).toHaveCount(2000);
    expect(await page.evaluate(() => Array.from(document.styleSheets).some((s) => Array.from(s.cssRules).some((r) => r.cssText.includes('.p-datatable-tbody'))))).toBe(true);
    expect(errors).toEqual([]);
});

test('upstream 22.1.3 · Table — no rule may select a body row by looking at the next row', async ({ page }) => {
    // REPRODUCES, and the cause is CSS, not the component. Script time per render, measured
    // 2026-11-02 on Chrome: 1,000 / 2,000 / 4,000 / 8,000 / 16,000 rows took 15 / 35 / 100 /
    // 321 / 1,225 ms (each doubling x2.2, 2.9, 3.2, 3.8 — converging on x4), against a native
    // table of the same rows at 3 / 4 / 6 / 10 / 20 ms. A CPU profile put the growth in the
    // DOM's insertBefore (1.7 ms at 4,000 rows, 697 ms at 16,000). Deleting ONE rule —
    // `.p-datatable-tbody > tr:has(+ .p-datatable-row-selected) > td` — took 16,000 rows from
    // 1,172 ms to 144 ms, the same as with every stylesheet disabled (139 ms): with that rule
    // live, every inserted row invalidates the row before it.
    test.fail();
    await open(page, 'table-perf');
    await page.evaluate(() => (window as unknown as { __aglRenderRows: (n: number) => number }).__aglRenderRows(10));
    expect(await siblingHasRules(page, '.p-datatable-tbody')).toEqual([]);
});

test('upstream 22.1.3 · TreeTable — rows render, and no rule selects a body row by looking at the next row', async ({ page }) => {
    // Does NOT reproduce. Same sizes as the table: 35 / 64 / 140 / 368 / 892 ms (x1.8, 2.2,
    // 2.6, 2.4) flat, and the same shape with nine expanded children per node. The treetable
    // stylesheet loaded at runtime carries no sibling :has() rule on its rows, which is the
    // difference this test holds on to.
    const errors = watchErrors(page);
    await open(page, 'treetable-perf');
    await page.evaluate(() => (window as unknown as { __aglRenderNodes: (n: number) => number }).__aglRenderNodes(2000));
    await expect(page.locator('#sec-treetable-perf tbody tr')).toHaveCount(2000);
    expect(await siblingHasRules(page, '.p-treetable-tbody')).toEqual([]);
    expect(errors).toEqual([]);
});
