import { expect, test, type Page } from '@playwright/test';

/**
 * The mandatory browser gate.
 *
 * Cutting scope, declaring change-detection strategies and swapping the icon dependency all
 * change runtime and DOM behaviour. Neither a green build nor a green unit suite is evidence
 * for that class of change: a component with the wrong change-detection strategy still
 * compiles cleanly and still initialises correctly — it simply **never repaints after state
 * changes**. Only a browser catches that.
 *
 * The scope here was chosen BY MEASUREMENT, not by intuition: the risky set is the modules
 * containing decorators that used to rely on the framework default (excluding the static SVG
 * icons). Eight modules measured, six of which have a surface a browser can drive:
 *   treetable (5 decorators — the worst) · table (3) · menu · tieredmenu · select · multiselect
 * `datepicker` was dropped from the initial list because re-measuring showed it has NO risky
 * decorators at all; keeping it would have manufactured a false sense of coverage.
 *
 * The rule every scenario below follows: **interact for real, then assert**. Asserting on a
 * static render is worthless here — the initial state is correct even when change detection
 * is completely broken. Every assertion reads a `.probe` element the app exposes, which means
 * it reads state that has travelled the full loop: interaction -> component -> view.
 */

const EVIDENCE = 'test-results/evidence';

/** Capture console errors and exceptions per test — a silent runtime error is still a failure. */
function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    return errors;
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#sec-table')).toBeVisible();
});

test('table — selecting a row round-trips state back into the view', async ({ page }) => {
    const errors = watchErrors(page);
    await expect(page.locator('#probe-table')).toHaveText('selection=none');

    await page.locator('#sec-table tr[data-code="P-002"]').click();

    await expect(page.locator('#probe-table')).toHaveText('selection=P-002');
    // The row-selection signal the library actually emits is a class, not `aria-selected`
    // (checked against upstream: neither sets `aria-selected` here).
    await expect(page.locator('#sec-table tr[data-code="P-002"]')).toHaveClass(/p-datatable-row-selected/);
    await expect(page.locator('#sec-table tr[data-code="P-001"]')).not.toHaveClass(/p-datatable-row-selected/);
    await page.screenshot({ path: `${EVIDENCE}/c3-table.png`, fullPage: false });
    expect(errors).toEqual([]);
});

test('treetable — expanding a node really renders its child rows', async ({ page }) => {
    const errors = watchErrors(page);
    // Only the root node exists before expanding.
    await expect(page.locator('#sec-treetable tbody tr')).toHaveCount(1);

    await page.locator('#sec-treetable button.p-treetable-toggler').first().click();

    await expect(page.locator('#sec-treetable tbody tr')).toHaveCount(3);
    await expect(page.locator('#sec-treetable tr[data-key="child-a"]')).toBeVisible();
    await expect(page.locator('#probe-treetable')).toHaveText('expanded=1');
    await page.screenshot({ path: `${EVIDENCE}/c3-treetable.png` });
    expect(errors).toEqual([]);
});

test('table advanced — column filter and cell editor, the remaining 3 risky decorators', async ({ page }) => {
    const errors = watchErrors(page);

    // ── agl-columnFilter + agl-columnFilterFormElement ──
    // `filterOn` defaults to 'enter' for type="text" (identical upstream), so typing alone
    // does NOT filter — Enter is required. The scenario follows the library's real behaviour.
    await expect(page.locator('#sec-table-adv tbody tr')).toHaveCount(3);
    await page.locator('#sec-table-adv agl-columnfilter input').fill('Wireless');
    await page.locator('#sec-table-adv agl-columnfilter input').press('Enter');

    await expect(page.locator('#sec-table-adv tbody tr')).toHaveCount(1);
    await expect(page.locator('#probe-table-adv')).toHaveText('rows=1');

    await page.locator('#sec-table-adv agl-columnfilter input').fill('');
    await page.locator('#sec-table-adv agl-columnfilter input').press('Enter');
    await expect(page.locator('#sec-table-adv tbody tr')).toHaveCount(3);

    // ── agl-cellEditor ──
    // The cell starts in display mode; clicking must switch it to input mode. This is
    // exactly the update that breaks silently under a wrong change-detection strategy:
    // `editing` flips but the view does not.
    await expect(page.locator('#sec-table-adv .qty-input')).toHaveCount(0);
    await page.locator('#sec-table-adv tr[data-adv-code="P-001"] .qty-cell').click();
    await expect(page.locator('#sec-table-adv .qty-input')).toHaveCount(1);
    await expect(page.locator('#sec-table-adv .qty-output')).toHaveCount(2);

    await page.screenshot({ path: `${EVIDENCE}/c3-table-advanced.png` });
    expect(errors).toEqual([]);
});

test('treetable scroll + cell edit — the remaining 2 risky decorators', async ({ page }) => {
    const errors = watchErrors(page);

    // ── [ttScrollableView] ── only constructed when scrollable=true.
    await expect(page.locator('#sec-treetable-scroll .p-treetable-scrollable-view')).toHaveCount(1);

    // ── agl-treeTableCellEditor ── only accepts a template via `aglTemplate`
    // (it has no `@ContentChild('input')` the way table's agl-cellEditor does).
    await expect(page.locator('#sec-treetable-scroll .note-input')).toHaveCount(0);
    await page.locator('#sec-treetable-scroll tr[data-scroll-key="n1"] .note-cell').click();
    await expect(page.locator('#sec-treetable-scroll .note-input')).toHaveCount(1);
    await expect(page.locator('#sec-treetable-scroll .note-output')).toHaveCount(3);

    // Edit the value and blur — the state must travel back to the model and out to the probe.
    await page.locator('#sec-treetable-scroll .note-input').fill('NOTE_UPDATED');
    await page.locator('#sec-treetable-scroll .note-input').press('Enter');
    await expect(page.locator('#probe-treetable-scroll')).toHaveText('note=NOTE_UPDATED');

    await page.screenshot({ path: `${EVIDENCE}/c3-treetable-scroll.png` });
    expect(errors).toEqual([]);
});

test('menu — clicking an item runs its command and updates the view', async ({ page }) => {
    const errors = watchErrors(page);
    await expect(page.locator('#probe-menu')).toHaveText('clicked=none');

    await page.locator('#menu-save a').click();

    await expect(page.locator('#probe-menu')).toHaveText('clicked=save');
    await page.screenshot({ path: `${EVIDENCE}/c3-menu.png` });
    expect(errors).toEqual([]);
});

test('tieredmenu — opens a submenu and clicks a nested item', async ({ page }) => {
    const errors = watchErrors(page);
    await expect(page.locator('#probe-tieredmenu')).toHaveText('clicked=none');

    // Level 1: open the branch. The submenu only exists in the DOM once it is open, which
    // is precisely the update that breaks silently under wrong change detection.
    await page.locator('#tiered-file > .p-tieredmenu-item-content').click();
    await expect(page.locator('#tiered-new')).toBeVisible();

    // Level 2: click the nested item.
    await page.locator('#tiered-new > .p-tieredmenu-item-content').click();

    await expect(page.locator('#probe-tieredmenu')).toHaveText('clicked=new');
    await page.screenshot({ path: `${EVIDENCE}/c3-tieredmenu.png` });
    expect(errors).toEqual([]);
});

test('select — opens the overlay, picks an item, and the value flows back to the model', async ({ page }) => {
    const errors = watchErrors(page);
    await expect(page.locator('#probe-select')).toHaveText('value=none');

    await page.locator('#sec-select agl-select').click();
    const option = page.locator('.p-select-option', { hasText: 'Da Nang' });
    await expect(option).toBeVisible();
    await option.click();

    await expect(page.locator('#probe-select')).toHaveText('value=DN');
    await expect(page.locator('#sec-select .p-select-label')).toHaveText('Da Nang');
    await page.screenshot({ path: `${EVIDENCE}/c3-select.png` });
    expect(errors).toEqual([]);
});

test('multiselect — selects several items and renders the header slot into the overlay', async ({ page }) => {
    const errors = watchErrors(page);
    await expect(page.locator('#probe-multiselect')).toHaveText('count=0');

    await page.locator('#sec-multiselect .p-multiselect-label-container').click();

    // Guards the silently-empty-slot defect class: the header simply never appears in the DOM
    // and nothing is thrown. The verification app now supplies it through `<ng-template #header>`,
    // the single surviving route after PA-1.
    // Scoped to the overlay, not to `.p-multiselect-header`. Before PA-1 the two routes rendered
    // to two different places: the `<agl-header>` facet was projected as the first child INSIDE
    // `.p-multiselect-header`, while a `#header` template rendered as a sibling just above it,
    // outside the header div and unaffected by `showHeader`. Retiring the facet leaves the
    // template route exactly where it has always rendered — PA-1 removes the second mechanism,
    // it does not relocate the surviving one — so the guard follows it to the overlay.
    await expect(page.locator('.p-multiselect-overlay .ms-facet-header')).toHaveText('FACET_HEADER_MULTISELECT');

    await page.locator('.p-multiselect-option', { hasText: 'Hanoi' }).click();
    await page.locator('.p-multiselect-option', { hasText: 'Ho Chi Minh City' }).click();

    await expect(page.locator('#probe-multiselect')).toHaveText('count=2');
    await page.screenshot({ path: `${EVIDENCE}/c3-multiselect.png` });
    expect(errors).toEqual([]);
});

test('facet card — header and footer project into the component slots', async ({ page }) => {
    const errors = watchErrors(page);
    // Regression guard for the silently-empty-slot defect class: eight sites broke with the
    // slot simply never appearing in the DOM and no error thrown. card has since migrated to
    // PA-1, so the entry point watched here is `<ng-template #header>` rather than the retired
    // `<ng-content select="agl-header">` facet. The failure mode being guarded is the same.
    await expect(page.locator('.p-card-header #card-header-facet')).toHaveText('FACET_HEADER_CARD');
    await expect(page.locator('.p-card-footer #card-footer-facet')).toHaveText('FACET_FOOTER_CARD');
    await page.screenshot({ path: `${EVIDENCE}/c3-facet-card.png` });
    expect(errors).toEqual([]);
});

test('facet dialog — the footer facet lands in the dialog footer slot', async ({ page }) => {
    const errors = watchErrors(page);
    await expect(page.locator('#probe-dialog')).toHaveText('visible=false');

    await page.locator('#open-dialog').click();

    await expect(page.locator('#probe-dialog')).toHaveText('visible=true');
    await expect(page.locator('.p-dialog-footer #dialog-footer-facet')).toHaveText('FACET_FOOTER_DIALOG');
    await page.screenshot({ path: `${EVIDENCE}/c3-facet-dialog.png` });
    expect(errors).toEqual([]);
});
