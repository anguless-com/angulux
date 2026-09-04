import { expect, test, type Page } from '@playwright/test';

/**
 * Upstream reproduction probes.
 *
 * SEPARATE FROM THE MANDATORY GATE ON PURPOSE. `risk-modules.spec.ts` answers "does our
 * library still work"; every assertion there is expected to pass and a failure is a
 * regression. This file answers a different question: "is a defect reported against
 * PrimeNG 22.1.0 also present in the code we inherited from 21.1.9?" — and a failure here
 * is a FINDING, not a regression.
 *
 * WHY THESE EXIST AT ALL. `tools/upstream/seen.json` triages every published upstream
 * changelog sentence against our tree. Nine entries came back `follow` — a module we ship.
 * Four of those were left undecided because they could not be judged by reading source:
 *
 *   • DatePicker  — min-time clamp reported to jump to 11:00
 *   • Table       — clear() and totalRecords after a data change
 *   • Table       — clearFilterValues() leaving constraints registered
 *   • Table       — frozen-column stacking (z-index)
 *
 * `seen.json` says of the first table entry, in as many words: *"Do not close this by
 * reasoning."* This file is how they get closed by measurement instead.
 *
 * MEASURED 2026-09-04, all four:
 *
 *   • DatePicker min-time clamp ......... REPRODUCES — renders 11 where 09 is the minimum
 *   • Table totalRecords after a change . REPRODUCES — 3 pages for a 2-row dataset
 *   • Table clear() and the filter box .. does NOT reproduce — box empties, rows return
 *   • Table frozen-column stacking ...... does NOT reproduce — frozen cell wins the point
 *
 * The two that reproduce are held below with `test.fail()`. The two that do not are kept
 * as ordinary passing tests: they are now the thing that would notice a regression, and
 * deleting them would throw away the only evidence that the question was ever asked.
 *
 * TWO CONSTITUTIONAL NOTES.
 *
 * P1 — these tests are written from OUR source and OUR behaviour. Upstream's code is not
 * read, diffed, or ported; the only thing taken from them is the published SENTENCE saying
 * a defect exists, which is a fact about software behaviour and carries no licence. The
 * fork diverged at 21.1.9, so a defect reported there may simply not exist here — which is
 * exactly what happened to the Select and Chart entries, both closed as not-ours.
 *
 * P3 — reproducing is not fixing. Every fix implied below changes runtime behaviour and is
 * therefore blocked in Phase 1. Producing evidence is not, which is why this step comes
 * first: it is the only part of the work P3 does not gate.
 */

const EVIDENCE = 'test-results/evidence';

/** A silent runtime error is still a failure — same rule as the mandatory gate. */
function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    return errors;
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#sec-up-datepicker')).toBeVisible();
});

/**
 * Upstream 22.1.0 · DatePicker · seen.json digest b3d68c790b2d.
 *
 * The mechanism, located in our own source before this test was written:
 * `datepicker.ts:2733` is a `switch (true)` branch whose condition is
 *
 *     isMinDate && !minHoursExceeds12
 *     && minDate.getHours() - 1 === convertedHour
 *     && minDate.getHours() > convertedHour
 *
 * and whose body is `returnTimeTriple[0] = 11` — a hard-coded 11 — followed by
 * `this.pm = true`. A second branch at :2727 hard-codes 11 the same way.
 *
 * The scenario puts `minDate` and the value on the SAME day at 09:00, which is what makes
 * `isMinDate` true, then steps the hour down once: `currentHour` 9 -> 8 satisfies both
 * `9 - 1 === 8` and `9 > 8`.
 *
 * What SHOULD happen: a minimum-time clamp holds the value at the minimum — 09.
 * What the branch does instead: assigns 11, an hour that is neither the minimum nor the
 * value the user asked for, and in `hourFormat="24"` is not even reachable by that path.
 */
test('upstream 22.1.0 · DatePicker — the min-time clamp must hold at the minimum', async ({ page }) => {
    // CONFIRMED DEFECT, held as an expected failure.
    //
    // `test.fail()` inverts the verdict: this passes while the defect is present and turns
    // RED the moment it is fixed. That is the behaviour wanted here. A plain failing test
    // would make a mandatory gate permanently red and get muted; a deleted test would leave
    // the finding as prose in a register nobody executes. This keeps the evidence runnable
    // and makes the fix announce itself.
    //
    // Measured 2026-09-04: decrementing one step below a 09:00 minDate renders 11, not 09.
    // Fixing it changes runtime behaviour, so it is gated by P3 in Phase 1.
    test.fail();

    const errors = watchErrors(page);
    const section = page.locator('#sec-up-datepicker');

    const hour = section.locator('.p-datepicker-hour-picker span');
    await expect(hour).toHaveText('09');

    // The hour picker renders exactly two buttons: [0] increment, [1] decrement. Asserting
    // the count keeps `nth(1)` from silently becoming the wrong control if the template moves.
    const buttons = section.locator('.p-datepicker-hour-picker agl-button');
    await expect(buttons).toHaveCount(2);

    // `repeat()` fires once immediately and only schedules its repeat 500ms later, so a
    // normal click is exactly one step down.
    await buttons.nth(1).click();

    await page.screenshot({ path: `${EVIDENCE}/upstream-datepicker-clamp.png` });

    // Clamped at the minimum is the only defensible outcome. 11 is the defect.
    await expect(hour).toHaveText('09');
    await expect(page.locator('#probe-up-datepicker')).toHaveText('hour=09');
    expect(errors).toEqual([]);
});


/**
 * Upstream 22.1.0 · Table · seen.json digest 9f85f9a516a5 — the entry marked
 * "Do not close this by reasoning."
 *
 * `onChanges()` at table.ts:1200 copies the `totalRecords` input into `_totalRecords`
 * only when `simpleChange.totalRecords.firstChange` is true, so every later change to
 * that input is dropped. Line 1212 then runs on the accompanying value change and assigns
 * `this.totalRecords = _totalRecords` whenever `_totalRecords` is non-zero — overwriting
 * the value Angular had just written into the input.
 *
 * The scenario declares five rows as five, then replaces BOTH the data and the count with
 * two in a single click, which is what any app does when it refetches. With `rows="2"`,
 * five records paginate into three pages and two records into one, so the page buttons are
 * the visible consequence.
 */
test('upstream 22.1.0 · Table — a changed totalRecords must reach the paginator', async ({ page }) => {
    // CONFIRMED DEFECT, held as an expected failure.
    //
    // `test.fail()` inverts the verdict: this passes while the defect is present and turns
    // RED the moment it is fixed. That is the behaviour wanted here. A plain failing test
    // would make a mandatory gate permanently red and get muted; a deleted test would leave
    // the finding as prose in a register nobody executes. This keeps the evidence runnable
    // and makes the fix announce itself.
    //
    // Measured 2026-09-04: after shrinking 5 rows to 2, the paginator still renders 3 pages.
    // Fixing it changes runtime behaviour, so it is gated by P3 in Phase 1.
    test.fail();

    const errors = watchErrors(page);
    const section = page.locator('#sec-up-table-total');

    const pages = section.locator('.p-paginator-pages button');
    await expect(pages).toHaveCount(3);
    await expect(section.locator('tbody tr')).toHaveCount(2);

    await page.locator('#up-total-shrink').click();

    await expect(page.locator('#probe-up-table-total')).toHaveText('rows=2 declared=2');
    await page.screenshot({ path: `${EVIDENCE}/upstream-table-totalrecords.png` });

    // Two records at two per page is one page. Three page buttons here means the table is
    // still paginating against the count it was given on the first change.
    await expect(pages).toHaveCount(1);
    expect(errors).toEqual([]);
});

/**
 * Upstream 22.1.0 · Table · seen.json digest d9c2f7aacdad.
 *
 * `clear()` delegates to `clearFilterValues()`, which assigns `filter.value = null` IN
 * PLACE (table.ts:2213-2223) and leaves the constraint registered, so `hasFilter()` — which
 * only asks whether `this.filters` has any key — keeps returning true.
 *
 * Two separate questions, asserted separately on purpose: the rows coming back is not the
 * same claim as the text leaving the box. A table that shows every row while its filter
 * box still reads "Wireless" is telling the user something false about its own state.
 */
test('upstream 22.1.0 · Table — clear() must empty the column filter box, not just the rows', async ({ page }) => {
    const errors = watchErrors(page);
    const section = page.locator('#sec-up-table-filter');
    const input = section.locator('agl-columnfilter input');

    await expect(section.locator('tbody tr')).toHaveCount(3);

    await input.fill('Wireless');
    await input.press('Enter');
    await expect(section.locator('tbody tr')).toHaveCount(1);

    await page.locator('#up-filter-clear').click();

    // (a) the rows come back
    await expect(section.locator('tbody tr')).toHaveCount(3);
    await page.screenshot({ path: `${EVIDENCE}/upstream-table-clear-filter.png` });

    // (b) and the box the user typed into is empty again
    await expect(input).toHaveValue('');
    expect(errors).toEqual([]);
});

/**
 * Upstream 22.1.0 · Table · seen.json digest 0c9d548f166c — "z-index/stacking, not
 * judgeable from source. Needs the browser gate."
 *
 * It is not judgeable from source because the library contributes no z-index here:
 * `aglFrozenColumn` sets position and offset through `cx("frozenColumn")` and the stacking
 * order comes from the theme CSS. So this asks the browser directly — scroll the body
 * sideways until a normal cell has travelled under the frozen column, then use
 * `elementFromPoint` at a spot over the frozen cell and see which element actually wins.
 *
 * `elementFromPoint` is the right instrument precisely because it resolves the real paint
 * order. A CSS assertion would only restate the stylesheet back to itself.
 */
test('upstream 22.1.0 · Table — a frozen column must stay above the cells scrolling under it', async ({ page }) => {
    const errors = watchErrors(page);
    const section = page.locator('#sec-up-table-frozen');
    await expect(section.locator('.frozen-cell').first()).toBeVisible();

    // Scroll the table body right so the second column passes beneath the frozen one.
    const scroller = section.locator('.p-datatable-table-container');
    await expect(scroller).toHaveCount(1);
    await scroller.evaluate((el) => el.scrollTo({ left: 300 }));
    await page.waitForTimeout(150);

    // PROVE THE TEST IS NOT VACUOUS BEFORE TRUSTING IT.
    //
    // If the container never scrolled — no horizontal overflow, a container that is not the
    // scrolling element, a layout change — then nothing is underneath the frozen column and
    // elementFromPoint returns the frozen cell for the trivial reason that it is the only
    // thing there. That is a green light for a question never asked, which is the failure
    // mode this repository has been bitten by often enough to have a memory about it.
    //
    // So: assert the scroll actually moved, and assert a normal cell now geometrically
    // extends under the frozen column's x-range. Only then does the paint-order check below
    // mean anything.
    const scrollLeft = await scroller.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBeGreaterThan(0);

    const frozen = section.locator('.frozen-cell').first();
    // elementFromPoint takes VIEWPORT coordinates. This section sits near the bottom of a
    // long page, so without scrolling it into view the sample point lands off-screen and
    // the call returns null — which reads like a stacking failure and is not one.
    await frozen.scrollIntoViewIfNeeded();
    const box = await frozen.boundingBox();
    expect(box).not.toBeNull();

    // The overlap is real: a scrolled cell starts to the LEFT of where the frozen column
    // ends, so it is genuinely passing underneath rather than sitting clear of it.
    const scrolledBox = await section.locator('.scrolled-cell').first().boundingBox();
    expect(scrolledBox).not.toBeNull();
    expect(scrolledBox.x).toBeLessThan(box.x + box.width);

    await page.screenshot({ path: `${EVIDENCE}/upstream-table-frozen.png` });

    // Sample the middle of the frozen cell. Whatever paints there must belong to the frozen
    // column; a scrolled cell winning that point is the defect.
    const winner = await page.evaluate(
        ({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            if (!el) return 'none';
            const cell = el.closest('td');
            if (!cell) return 'not-a-cell:' + el.className;
            return cell.className.includes('frozen-cell') ? 'frozen' : 'scrolled:' + cell.className;
        },
        { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    );

    expect(winner).toBe('frozen');
    expect(errors).toEqual([]);
});
