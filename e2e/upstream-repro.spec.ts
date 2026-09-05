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
 * MEASURED 2026-09-05, three more — two of them because the register had been closed by
 * reasoning rather than by running anything, and one because it had never been opened:
 *
 *   • Button  buttonProps.outlined on its own ... does NOT reproduce — the class is applied
 *   • Button and Table  outlined:false override  REPRODUCES — `size: 'small'` out of the SAME
 *                                                props object arrives; only outlined cannot
 *   • Core  styles inside a shadow root ........ REPRODUCES — rgb(239, 239, 239) against
 *                                                rgb(16, 185, 129) in the light DOM
 *
 * The `outlined` entry is why that pass happened. seen.json held it as REPRODUCES with a
 * mechanism WIDER than upstream stated — "outlined is ignored on EVERY agl-button" — and it
 * was the only one of the five closed without running anything. The browser says the wide
 * half is false and the narrow half is true, which is neither what the register claimed nor
 * what a second reading of the source predicted. Same lesson as the totalRecords entry from
 * the other side: reasoning had the direction right and the mechanism wrong, and it is the
 * mechanism that says where a fix would go.
 *
 * FIXED 2026-09-05, two of the five, under Constitution P3.a (v1.3.0):
 *
 *   • DatePicker min-time clamp ......... two branches assigning a hard-coded 11 removed;
 *                                         each was a strict subset of a general clamp
 *   • Table totalRecords after a change . `onChanges` mirrors every change, not the first
 *
 * Both were held with `test.fail()` until then, and both had to be converted BECAUSE the
 * fix made them fail as unexpected passes. That is the property the inversion was chosen
 * for: the fix announces itself instead of relying on somebody remembering this file.
 *
 * Why these two and not the other three: P3.a admits a change as a defect fix only when it
 * touches no API surface, contradicts what the component itself says it does, is SILENT,
 * and ships with a browser test that was red before and green after. `buttonProps.outlined`
 * fails the third condition — the user can see the property has no effect — and was already
 * refused on that ground on 2026-08-26; the 2026-09-05 measurement narrowed its mechanism
 * and left that refusal standing. Shadow-root support needs a new container option on
 * `useStyle`, which is API. Both stay held below.
 *
 * The ones that still reproduce are held with `test.fail()`. The ones that do not are kept
 * as ordinary passing tests: they are now the thing that would notice a regression, and
 * deleting them would throw away the only evidence that the question was ever asked.
 *
 * A NOTE ON PREMISES, which is why some entries below are two tests rather than one.
 * `test.fail()` inverts the verdict for the whole test, so an assertion that merely sets the
 * scene is absorbed by it: if the popover stopped opening, or the theme stopped loading, the
 * test would go green on a defect it never reached — a false green produced by the guard
 * meant to prevent one. The 2026-09-05 entries therefore split the scene-setting into an
 * ordinary test that MUST PASS, leaving the expected failure holding one assertion and
 * nothing else. The two 2026-09-04 entries above still carry their premises inside the
 * `test.fail()` body and are exposed to this; they are left as they were measured, and the
 * fix for them is the same split.
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
    // FIXED 2026-09-05 under Constitution P3.a (v1.3.0). Held with `test.fail()` from
    // 2026-09-04 until then, and that is exactly how the fix announced itself: the moment
    // `constrainTime` stopped returning 11, this test failed as an UNEXPECTED PASS and had to
    // be converted deliberately. It is now an ordinary regression guard, and the premises it
    // asserts below are no longer absorbed by an inverted verdict.
    //
    // The fix removed two branches that assigned a hard-coded 11. Each condition was a strict
    // subset of a general minimum clamp further down the same switch, and those clamps assign
    // the minimum itself.
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
    // FIXED 2026-09-05 under Constitution P3.a (v1.3.0). Held with `test.fail()` from
    // 2026-09-04 until then; converting it was forced by the fix rather than remembered,
    // which is the whole reason for holding it that way. Now an ordinary regression guard.
    //
    // The fix was one clause: `onChanges` mirrored `totalRecords` into `_totalRecords` only
    // when `firstChange` was true, so every later value was dropped and the stale mirror was
    // written back over the input.
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

/**
 * Upstream 22.1.0 · Table · seen.json digest 3ae212c58d45 — the WIDE half.
 *
 * The register says of this entry: "button.ts never reads buttonProps?.outlined ... so
 * outlined is ignored on EVERY agl-button, not just this one." That is a claim about every
 * button in the library, and it is the one claim of the five that was written from source
 * rather than from a browser.
 *
 * Reading the source a second time disagrees with it. `buttonstyle.ts:17` is
 *
 *     'p-button-outlined': instance.outlined || instance.variant === 'outlined'
 *         || instance.buttonProps?.outlined || instance.buttonProps?.variant === 'outlined'
 *
 * — buttonProps IS read — and the theme has exactly one selector for this, `.p-button-outlined`
 * (angulux-styles/src/button/index.ts:314). The getter that omits buttonProps is `dataP` at
 * button.ts:864, and the string `data-p` does not appear in that stylesheet at all.
 *
 * But source is what got this entry wrong the first time, so this asks the browser instead.
 * The control button is not decoration: without it, "no p-button-outlined" could equally mean
 * the class exists nowhere, and the test would go green on nothing.
 */
test('upstream 22.1.0 · Button — buttonProps.outlined alone must render an outlined button', async ({ page }) => {
    const errors = watchErrors(page);
    const section = page.locator('#sec-up-button-outlined');
    await expect(section).toBeVisible();

    // PREMISE: a button that asked for nothing is not outlined. If this were already
    // outlined, every assertion below would be satisfied by the default and prove nothing.
    await expect(page.locator('#up-btn-plain button')).not.toHaveClass(/p-button-outlined/);

    await page.screenshot({ path: `${EVIDENCE}/upstream-button-outlined.png` });

    // The register's wide claim predicts this class is absent. The source predicts it is present.
    await expect(page.locator('#up-btn-props-only button')).toHaveClass(/p-button-outlined/);
    expect(errors).toEqual([]);
});

/**
 * Upstream 22.1.0 · Table · seen.json digest 3ae212c58d45 — the NARROW half, modelled.
 *
 * This is the shape `table.ts:5394-5398` hard-codes: `[outlined]="true"` on the element AND
 * `[buttonProps]="filterButtonProps?.popover?.clear"` beside it. Because `classes.root` starts
 * with `instance.outlined || ...`, a `false` arriving through buttonProps has nothing left to
 * decide — the first operand already settled the expression.
 *
 * Whether that is a defect is a question about what the input is FOR. `filterButtonProps` is
 * the only handle the table offers over that button, and its own documentation calls it "all
 * filter button property object". A handle that can turn a property on but never off is a
 * handle that misstates its range, which is what upstream reported.
 *
 * Both premises this test would otherwise assert for itself — the class is reachable, and the
 * default is not already outlined — are asserted by the ordinary test above. That is on
 * purpose: see the note on premises in the file header.
 */
test('upstream 22.1.0 · Button — buttonProps.outlined false must be able to turn outlined off', async ({ page }) => {
    // CONFIRMED DEFECT, held as an expected failure.
    //
    // Measured 2026-09-05: the button renders `p-ripple p-button p-button-outlined p-component`
    // while its buttonProps says `outlined: false`. Unreachable by construction rather than by
    // accident — `instance.outlined` is the first operand of the `||` chain.
    // Fixing it changes runtime behaviour, so it is gated by P3 in Phase 1.
    test.fail();

    await expect(page.locator('#up-btn-cannot-off button')).not.toHaveClass(/p-button-outlined/);
});

/**
 * The premise the expected failure below rests on, asserted where a failure is still visible.
 *
 * `test.fail()` inverts the verdict for the WHOLE test, so a premise assertion living inside
 * one is absorbed by it: if the popover stopped opening, the test would go green for the wrong
 * reason and report a defect it never reached. Hence the pairing — this test must pass, the
 * next one must fail, and between them there is no arrangement of the page that reads as
 * "confirmed" without the confirmation actually happening.
 *
 * The `p-button-sm` assertion is the load-bearing one. `size: 'small'` sits in the SAME props
 * object as `outlined: false`, so seeing it on the button proves the object arrived and was
 * read — which rules out every explanation of the next failure that begins "the input never
 * got there".
 */
test('upstream 22.1.0 · Table — the filter popover opens and its clear button reads the props object', async ({ page }) => {
    const errors = watchErrors(page);
    const section = page.locator('#sec-up-table-clearbtn');
    await expect(section).toBeVisible();

    await section.locator('.p-datatable-column-filter-button').click();

    const bar = page.locator('.p-datatable-filter-buttonbar');
    await expect(bar).toBeVisible();

    const clear = bar.locator('agl-button button').first();
    await expect(clear).toBeVisible();
    await expect(clear).toHaveAttribute('data-pc-name', 'pcfilterclearbutton');

    await page.screenshot({ path: `${EVIDENCE}/upstream-table-clear-outlined.png` });

    // The props object reached the button: this class can only come from it.
    await expect(clear).toHaveClass(/p-button-sm/);
    expect(errors).toEqual([]);
});

/**
 * Upstream 22.1.0 · Table · seen.json digest 3ae212c58d45 — the NARROW half, for real.
 *
 * The two tests above use a bare `agl-button` shaped like the table's clear button. This one
 * drives the actual component: `agl-columnFilter` in menu display, whose popover renders the
 * clear button at table.ts:5391-5401 with the hard-coded `[outlined]="true"`.
 *
 * The scenario hands it the shipped default of `filterButtonProps` with exactly one value
 * changed — `popover.clear.outlined: false` — so a difference here is attributable to that
 * value and to nothing else.
 */
test('upstream 22.1.0 · Table — filterButtonProps.popover.clear.outlined must reach the clear button', async ({ page }) => {
    // CONFIRMED DEFECT, held as an expected failure.
    //
    // Measured 2026-09-05 on the real component: the button carrying
    // data-pc-name="pcfilterclearbutton" renders
    // `p-ripple p-button p-button-outlined p-button-sm p-component` while
    // filterButtonProps.popover.clear is `{ outlined: false, size: 'small' }`.
    // Fixing it changes runtime behaviour, so it is gated by P3 in Phase 1.
    test.fail();

    const section = page.locator('#sec-up-table-clearbtn');
    await section.locator('.p-datatable-column-filter-button').click();

    const clear = page.locator('.p-datatable-filter-buttonbar').locator('agl-button button').first();
    await expect(clear).not.toHaveClass(/p-button-outlined/);
});

/**
 * The premise for the shadow-root failure below — same pairing, same reason.
 *
 * A comparison of two computed backgrounds is only evidence if the control side is actually
 * themed. Two unstyled buttons compare equal, and that equality would read as success while
 * proving that nothing anywhere is styled.
 */
test('upstream 22.1.0 · Core — the shadow host renders and the light-DOM control is themed', async ({ page }) => {
    const errors = watchErrors(page);
    await expect(page.locator('#sec-up-shadow')).toBeVisible();

    // Playwright's CSS engine pierces open shadow roots, so a miss here means the host did not
    // render — not that the styles failed to arrive.
    await expect(page.locator('#up-shadow-light button')).toBeVisible();
    await expect(page.locator('agl-verify-shadow .shadow-probe button')).toBeVisible();

    const lightBg = await page.locator('#up-shadow-light button').evaluate((el) => getComputedStyle(el).backgroundColor);

    await page.screenshot({ path: `${EVIDENCE}/upstream-shadow-dom.png` });

    // An unstyled button computes to a transparent background. This one must not be.
    expect(lightBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(lightBg).not.toBe('transparent');
    expect(errors).toEqual([]);
});

/**
 * Upstream 22.1.0 · Core — "styles are not applied inside Shadow DOM".
 *
 * Triaged `cross-cutting` in seen.json and left without a note, because a framework-level
 * sentence names no module to point a test at. It names something real here anyway:
 * `usestyle.ts:25` resolves the insertion point as `this.document.head` and appends there.
 * Nothing in the tree calls `getRootNode()`, and there is no option to nominate a different
 * container — so a component rendered inside a shadow root is cut off from every rule the
 * library ships.
 *
 * MEASURED AS A DIFFERENCE, deliberately. Asserting a literal colour would pin this test to
 * the current theme. Two identical buttons, one boundary between them, and the boundary is
 * the only variable.
 *
 * `background-color` is the probe because it is NOT an inherited property. Design tokens are
 * custom properties and those DO cross a shadow boundary, so a token-based assertion would
 * report success while the rule that consumes the token never arrived.
 */
test('upstream 22.1.0 · Core — a component inside a shadow root must still receive its styles', async ({ page }) => {
    // CONFIRMED, held as an expected failure.
    //
    // Measured 2026-09-05: the light-DOM button computes to rgb(16, 185, 129); the identical
    // button inside the shadow root computes to rgb(239, 239, 239), the user-agent default for
    // a <button>. No library rule reached it at all.
    //
    // Called a LIMITATION rather than a defect, and held the same way regardless. Nothing here
    // promises shadow-root support, so no stated contract is broken; but a consumer who puts
    // angulux inside a web component gets an unstyled library and no diagnostic, and that is
    // worth a test that turns red the day it stops being true. Supporting it means giving
    // useStyle a container to insert into, which is new API — Phase 2 under P3.
    test.fail();

    const lightBg = await page.locator('#up-shadow-light button').evaluate((el) => getComputedStyle(el).backgroundColor);
    const shadowBg = await page.locator('agl-verify-shadow .shadow-probe button').evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(shadowBg).toBe(lightBg);
});
