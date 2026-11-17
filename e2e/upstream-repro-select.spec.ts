import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Upstream reproduction probes for Select (#168): the Select entries of the PrimeNG 22.1.2 to
 * 22.1.5 changelogs.
 *
 * Same contract as upstream-repro-22-1-5.spec.ts: only the published SENTENCE is taken from
 * upstream, every scene is written from OUR source and measured in Chrome (Constitution P1). Each
 * test asserts the behaviour that is right, so a defect that reproduces turns it red. The verdict
 * of each entry is in tools/upstream/seen.json under the digest named on its test.
 *
 * The probe page is apps/verify/src/upstream-select.ts, one scene per `?case=`.
 *
 * MEASURED 2026-11-17, the 56 Select entries of 22.1.2 to 22.1.5: 22 reproduce and were FIXED
 * the same day under Constitution P3.c, mostly the editable input (its role, name, writes,
 * placeholder, style and type-ahead), keyboard paths (Tab to the parent, the custom filter, IME,
 * the label click) and the read-only clear icon; 12 do not. aria-autocomplete came with the
 * combobox role, and the type-ahead timers are cleared on destroy although nothing measurable
 * followed. The other 20 are their tests, docs or demos, a mode we do not have, or API, which
 * waits for the Angular 23 round. Every test below asserts the right behaviour;
 * tools/upstream/seen.json has each verdict.
 */

function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    return errors;
}

async function open(page: Page, kase: string): Promise<void> {
    await page.goto(`/upstream-select?case=${kase}`);
    await expect(page.locator(`#sec-${kase}`)).toBeVisible();
}

function note(type: string, description: string): void {
    test.info().annotations.push({ type, description });
    console.log(`[${test.info().title.slice(0, 60)}] ${type}: ${description}`);
}

const host = (page: Page, inputId: string): Locator => page.locator(`agl-select:has(#${inputId})`);
const overlay = (page: Page): Locator => page.locator('.p-select-overlay');
const optionsIn = (page: Page): Locator => overlay(page).locator('li[role="option"]:not(.p-select-empty-message)');

async function openPanel(page: Page, inputId: string): Promise<void> {
    await host(page, inputId).locator('.p-select-dropdown').click();
    await expect(overlay(page)).toBeVisible();
}

async function readLog(page: Page, key: string): Promise<string[]> {
    return page.evaluate((k) => [...((window as unknown as { __aglSelect: Record<string, string[]> }).__aglSelect[k] ?? [])], key);
}

// ─── 22.1.5 ──────────────────────────────────────────────────────────────────────────────────

test('22.1.5 · select · timers — a Select removed right after a keystroke writes nothing afterwards', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'timers');
    await page.evaluate(() => {
        const el = document.getElementById('timers-input')!;
        el.focus();
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', bubbles: true }));
        (window as unknown as { __aglDestroyTimers: () => void }).__aglDestroyTimers();
    });
    await expect(page.locator('#timers-input')).toHaveCount(0);
    await page.waitForTimeout(800);
    const log = await readLog(page, 'log');
    note('control values', JSON.stringify(log));
    expect(log.filter((l) => l.startsWith('AFTER-DESTROY'))).toEqual([]);
    expect(errors).toEqual([]);
});

test('22.1.5 · select · null label — an option whose label is null breaks neither type-ahead nor the editable input', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'null-label');
    await page.focus('#nl-input');
    await page.keyboard.press('h');
    await expect(optionsIn(page).filter({ hasText: 'Hanoi' })).toHaveAttribute('data-p-focused', 'true');
    await page.keyboard.press('Escape');
    await page.click('#nl-editable');
    await page.keyboard.type('h');
    await page.waitForTimeout(300);
    note('errors', JSON.stringify(errors));
    expect(errors).toEqual([]);
});

test('22.1.5 · select · editable name — the editable input keeps its label as accessible name after a pick', async ({ page }) => {
    await open(page, 'editable-a11y');
    const input = page.locator('#ea-input');
    await expect(input).toHaveAccessibleName('City');
    await openPanel(page, 'ea-input');
    await optionsIn(page).filter({ hasText: 'Hanoi' }).click();
    await expect(input).toHaveValue('Hanoi');
    await expect(input).toHaveAccessibleName('City');
});

test('22.1.3 · select · editable role — the editable input is a combobox with list autocomplete', async ({ page }) => {
    await open(page, 'editable-a11y');
    const input = page.locator('#ea-input');
    await expect(input).toHaveAttribute('role', 'combobox');
    await expect(input).toHaveAttribute('aria-autocomplete', 'list');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await openPanel(page, 'ea-input');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveAttribute('aria-controls', /_list$/);
});

test('22.1.3 · select · dropdown icon — the trigger, which cannot take focus, is hidden from assistive technology', async ({ page }) => {
    await open(page, 'editable-a11y');
    const trigger = host(page, 'ea-plain').locator('.p-select-dropdown');
    const focusable = await trigger.evaluate((el) => el.hasAttribute('tabindex'));
    expect(focusable, 'the trigger takes no focus').toBe(false);
    await expect(trigger).toHaveAttribute('aria-hidden', 'true');
});

test('22.1.5 · select · empty message — with the filter on and nothing typed, an empty list shows emptyMessage', async ({ page }) => {
    await open(page, 'empty-message');
    await openPanel(page, 'em-input');
    await expect(overlay(page).locator('.p-select-empty-message')).toHaveText('Nothing here');
});

for (const [id, read] of [
    ['fl-plain-input', 'label'],
    ['fl-template-input', 'template'],
    ['fl-editable-input', 'editable']
] as const) {
    test(`22.1.5 · select · label while filtering — ${read}: the selected label stays while the filter hides it`, async ({ page }) => {
        await open(page, 'filter-label');
        await openPanel(page, id);
        await overlay(page).locator('input[role="searchbox"]').fill('Hue');
        await expect(optionsIn(page)).toHaveCount(1);
        if (read === 'label') await expect(page.locator(`#${id}`)).toHaveText('Hanoi');
        if (read === 'template') await expect(host(page, id).locator('.fl-selected')).toHaveText('sel:Hanoi');
        if (read === 'editable') await expect(page.locator(`#${id}`)).toHaveValue('Hanoi');
    });
}

test('22.1.5 + 22.1.3 · select · grouped options — 3,100 grouped rows open and filter about as fast as 3,100 flat ones', async ({ page }) => {
    await open(page, 'grouped');
    const time = async (id: string, rows: number) => {
        const t0 = await page.evaluate(() => performance.now());
        await openPanel(page, id);
        await expect(overlay(page).locator('li')).toHaveCount(rows, { timeout: 30_000 });
        const opened = (await page.evaluate(() => performance.now())) - t0;
        const t1 = await page.evaluate(() => performance.now());
        await overlay(page).locator('input[role="searchbox"]').fill('Item 5');
        await expect(overlay(page).locator('li[role="option"]').first()).toBeVisible();
        await page.waitForTimeout(50);
        const filtered = (await page.evaluate(() => performance.now())) - t1;
        await page.keyboard.press('Escape');
        await expect(overlay(page)).toHaveCount(0);
        return { opened: Math.round(opened), filtered: Math.round(filtered) };
    };
    const flat = await time('gr-flat', 3000);
    const grouped = await time('gr-grouped', 3100);
    note('flat: open / filter ms', `${flat.opened} / ${flat.filtered}`);
    note('grouped: open / filter ms', `${grouped.opened} / ${grouped.filtered}`);
    expect(grouped.opened).toBeLessThan(flat.opened * 1.5 + 100);
    expect(grouped.filtered).toBeLessThan(flat.filtered * 1.5 + 100);
});

test('22.1.5 · select · unmatched value — an editable Select does not print an unmatched object as [object Object]', async ({ page }) => {
    await open(page, 'editable-values');
    const value = await page.locator('#ev-object').inputValue();
    note('input value', value);
    expect(value).not.toContain('[object Object]');
});

test('22.1.5 · select · empty string — an editable Select shows its placeholder when the value is an empty string', async ({ page }) => {
    await open(page, 'editable-values');
    await expect(page.locator('#ev-null')).toHaveAttribute('placeholder', 'Null value');
    await expect(page.locator('#ev-empty')).toHaveAttribute('placeholder', 'Empty string');
});

test('22.1.5 · select · lazy filter — typing in the filter of a lazy Select asks for data again', async ({ page }) => {
    await open(page, 'lazy-filter');
    await openPanel(page, 'lf-input');
    await page.waitForTimeout(300);
    const before = Number(await page.locator('#lf-count').innerText());
    await overlay(page).locator('input[role="searchbox"]').fill('Lazy 5');
    await page.waitForTimeout(400);
    const after = Number(await page.locator('#lf-count').innerText());
    note('lazy loads before / after typing', `${before} / ${after}`);
    expect(after).toBeGreaterThan(before);
});

// ─── 22.1.4 ──────────────────────────────────────────────────────────────────────────────────

test('22.1.4 · select · tab — Tab reaches the parent, with the panel open or closed', async ({ page }) => {
    await open(page, 'tab-parent');
    await page.focus('#tp-input');
    await page.keyboard.press('Tab');
    await expect(page.locator('#tp-after')).toBeFocused();
    await page.focus('#tp-input');
    await page.keyboard.press('Enter');
    await expect(overlay(page)).toBeVisible();
    await page.keyboard.press('Tab');
    // The count is rendered by change detection after the keydown, so it is awaited, not read at once.
    await expect(page.locator('#tp-count')).toHaveText('2');
    note('Tab keydowns the wrapper saw', await page.locator('#tp-count').innerText());
});

test('22.1.3 · select · label click — clicking the associated label focuses the Select', async ({ page }) => {
    await open(page, 'label-click');
    await page.click('#lc-label');
    await expect(page.locator('#lc-input')).toBeFocused();
});

test('22.1.4 · select · disabled label click — clicking the label of a disabled Select neither focuses nor touches it', async ({ page }) => {
    await open(page, 'label-click');
    await page.click('#lcd-label');
    await page.waitForTimeout(200);
    await expect(page.locator('#lcd-input')).not.toBeFocused();
    await expect(page.locator('#lcd-touched')).toHaveText('false');
});

test('22.1.4 · select · custom filter — Down arrow in a custom filter template moves the focused option', async ({ page }) => {
    await open(page, 'custom-filter');
    await openPanel(page, 'cf-select');
    await page.click('#cf-input');
    await page.keyboard.press('ArrowDown');
    await expect(overlay(page).locator('li[data-p-focused="true"]')).toHaveCount(1);
});

// ─── 22.1.3 ──────────────────────────────────────────────────────────────────────────────────

test('22.1.3 · select · empty group — filtering does not throw when a group has no children', async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, 'group-empty');
    await openPanel(page, 'ge-input');
    await overlay(page).locator('input[role="searchbox"]').fill('Ha');
    await expect(optionsIn(page).filter({ hasText: 'Hanoi' })).toBeVisible();
    note('errors', JSON.stringify(errors));
    expect(errors).toEqual([]);
});

test('22.1.3 · select · editable writes — one keystroke writes one value to the form', async ({ page }) => {
    await open(page, 'editable-typing');
    await page.click('#et-input');
    await page.keyboard.type('z');
    await page.waitForTimeout(200);
    const log = await readLog(page, 'typingLog');
    note('values written', JSON.stringify(log));
    expect(log).toEqual(['z']);
});

test('22.1.3 · select · editable caret — a partly matched value can be edited in the middle', async ({ page }) => {
    await open(page, 'editable-typing');
    await page.click('#et-input');
    await page.keyboard.type('Han');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('x');
    await page.waitForTimeout(100);
    await expect(page.locator('#et-input')).toHaveValue('Hxan');
});

test('22.1.3 · select · editable focus — typing what matches nothing focuses no option', async ({ page }) => {
    await open(page, 'editable-typing');
    await page.click('#et-input');
    const focused: number[] = [];
    for (const ch of 'zzzz') {
        await page.keyboard.type(ch);
        await page.waitForTimeout(80);
        focused.push(await overlay(page).locator('li[data-p-focused="true"]').count());
    }
    note('focused options after each key', focused.join(' '));
    expect(focused).toEqual([0, 0, 0, 0]);
});

test('22.1.3 · select · editable selectOnFocus — one keystroke writes one value, the one typed', async ({ page }) => {
    await open(page, 'editable-typing');
    await page.click('#et-focus');
    await page.keyboard.type('H');
    await page.waitForTimeout(300);
    const log = await readLog(page, 'typingFocusLog');
    note('values written', JSON.stringify(log));
    expect(log).toEqual(['H']);
});

test('22.1.3 · select · editable style — typed text is not styled as a placeholder', async ({ page }) => {
    await open(page, 'editable-typing');
    await page.click('#et-input');
    await page.keyboard.type('zz');
    await page.waitForTimeout(100);
    const cls = await page.locator('#et-input').getAttribute('class');
    note('class', String(cls));
    expect(cls ?? '').not.toContain('p-placeholder');
});

test('22.1.3 · select · disabled focus — opening never puts focus on a disabled option', async ({ page }) => {
    await open(page, 'disabled-focus');
    const focusedIsDisabled = async () => {
        const focused = overlay(page).locator('li[data-p-focused="true"]');
        return (await focused.count()) > 0 && (await focused.first().getAttribute('data-p-disabled')) === 'true';
    };
    const seen: string[] = [];
    await openPanel(page, 'df-input');
    seen.push(`click:${await focusedIsDisabled()}`);
    await page.keyboard.press('Escape');
    await page.focus('#df-input');
    await page.keyboard.press('ArrowDown');
    await expect(overlay(page)).toBeVisible();
    seen.push(`down:${await focusedIsDisabled()}`);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    await expect(overlay(page)).toBeVisible();
    seen.push(`enter:${await focusedIsDisabled()}`);
    note('focused option disabled after each way of opening', seen.join(' '));
    expect(seen).toEqual(['click:false', 'down:false', 'enter:false']);
});

test('22.1.3 · select · sentinels — the hidden focus sentinels do not carry both aria-hidden and a tabindex', async ({ page }) => {
    await open(page, 'structure');
    await openPanel(page, 'st-input');
    const both = await overlay(page)
        .locator('.p-hidden-focusable')
        .evaluateAll((els) => els.filter((e) => e.getAttribute('aria-hidden') === 'true' && e.hasAttribute('tabindex')).length);
    expect(both).toBe(0);
});

test('22.1.3 · select · empty option — the empty message is not offered as a selectable option', async ({ page }) => {
    await open(page, 'structure');
    await openPanel(page, 'st-empty');
    const empty = overlay(page).locator('.p-select-empty-message');
    const role = await empty.getAttribute('role');
    const disabled = await empty.getAttribute('aria-disabled');
    note('role / aria-disabled', `${role} / ${disabled}`);
    expect(role !== 'option' || disabled === 'true').toBe(true);
});

test('22.1.3 · select · option name — a custom option template is part of the option name', async ({ page }) => {
    await open(page, 'structure');
    await openPanel(page, 'st-template');
    await expect(optionsIn(page).first()).toHaveAccessibleName(/Hanoi \(HN\)/);
});

test('22.1.3 · select · filter results — the number of results is announced while filtering', async ({ page }) => {
    await open(page, 'structure');
    await openPanel(page, 'st-input');
    await overlay(page).locator('input[role="searchbox"]').fill('H');
    const status = overlay(page).locator('[role="status"], [aria-live]');
    await expect(status).toHaveCount(1);
    await expect(status).not.toHaveText('');
    await overlay(page).locator('input[role="searchbox"]').fill('zzz');
    await expect(status).toContainText(/no results/i);
});

test('22.1.3 · select · selection checks — each option row checks its selection once per change detection', async ({ page }) => {
    await open(page, 'structure');
    await openPanel(page, 'st-input');
    const perRow = await page.evaluate(() => {
        const ng = (window as unknown as { ng: { getComponent: (el: Element) => Record<string, unknown>; applyChanges: (c: unknown) => void } }).ng;
        const select = ng.getComponent(document.querySelector('agl-select:has(#st-input)')!) as { isSelected: (o: unknown) => boolean };
        let calls = 0;
        const original = select.isSelected;
        select.isSelected = function (this: unknown, o: unknown) {
            calls++;
            return original.call(this, o);
        };
        ng.applyChanges(select);
        select.isSelected = original;
        return calls / 4;
    });
    note('isSelected calls per row', String(perRow));
    expect(perRow).toBeLessThanOrEqual(1);
});

test('22.1.2 · select · template re-render — moving focus does not re-create custom option templates', async ({ page }) => {
    await open(page, 'structure');
    await openPanel(page, 'st-template');
    await page.evaluate(() => {
        const w = window as unknown as { __added: number };
        w.__added = 0;
        new MutationObserver((records) => {
            for (const r of records) for (const n of Array.from(r.addedNodes)) if (n instanceof HTMLElement && (n.matches('.st-item') || n.querySelector('.st-item'))) w.__added++;
        }).observe(document.body, { childList: true, subtree: true });
    });
    await page.focus('#st-template');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const added = await page.evaluate(() => (window as unknown as { __added: number }).__added);
    note('option templates re-created', String(added));
    expect(added).toBe(0);
});

test('22.1.3 + 22.1.2 · select · readonly — a read-only Select cannot be opened or cleared, and says it is read-only', async ({ page }) => {
    await open(page, 'readonly');
    await host(page, 'ro-input').click();
    await expect(overlay(page)).toHaveCount(0);
    await page.focus('#ro-input');
    await page.keyboard.press('ArrowDown');
    await expect(overlay(page)).toHaveCount(0);
    const clear = host(page, 'ro-input').locator('[data-pc-section="clearicon"]');
    if (await clear.count()) await clear.first().click();
    await expect(page.locator('#ro-input')).toHaveText('Hanoi');
    await expect(page.locator('#ro-input')).toHaveAttribute('aria-readonly', 'true');
});

test('22.1.2 · select · loading clear — the clear icon does not empty a loading Select', async ({ page }) => {
    await open(page, 'readonly');
    const clear = host(page, 'lo-input').locator('[data-pc-section="clearicon"]');
    if (await clear.count()) await clear.first().click();
    await expect(page.locator('#lo-input')).toHaveText('Da Nang');
});

test('22.1.3 · select · required — a required Select makes its form invalid until a pick', async ({ page }) => {
    await open(page, 'required');
    await expect(page.locator('#rq-valid')).toHaveText('false');
    await expect(page.locator('#rq-input')).toHaveAttribute('aria-required', 'true');
    await openPanel(page, 'rq-input');
    await optionsIn(page).filter({ hasText: 'Hue' }).click();
    await expect(page.locator('#rq-valid')).toHaveText('true');
});

test('22.1.5 · select · optionLabel — the label, the filter, type-ahead and the editable input all use optionLabel', async ({ page }) => {
    await open(page, 'option-label');
    await openPanel(page, 'ol-input');
    await expect(optionsIn(page).first()).toHaveText('Hanoi');
    await overlay(page).locator('input[role="searchbox"]').fill('label-');
    await expect(optionsIn(page)).toHaveCount(0);
    await overlay(page).locator('input[role="searchbox"]').fill('Hu');
    await expect(optionsIn(page)).toHaveText(['Hue']);
    // The filter is kept when the panel closes (resetFilterOnHide is false), so it is cleared first.
    await overlay(page).locator('input[role="searchbox"]').fill('');
    await page.keyboard.press('Escape');
    await expect(overlay(page)).toHaveCount(0);
    await page.focus('#ol-input');
    await page.keyboard.press('d');
    await expect(optionsIn(page).filter({ hasText: 'Da Nang' })).toHaveAttribute('data-p-focused', 'true');
    await page.keyboard.press('Enter');
    await expect(page.locator('#ol-input')).toHaveText('Da Nang');
    await expect(page.locator('#ol-editable-input')).toHaveValue('Da Nang');
});

test('22.1.3 · select · templates — every declared template renders in its state', async ({ page }) => {
    await open(page, 'templates');
    const missing: string[] = [];
    const check = async (cls: string) => ((await page.locator(`.${cls}`).count()) ? null : missing.push(cls));
    await check('tpl-selected');
    await check('tpl-dropdownicon');
    await check('tpl-clearicon');
    await check('tpl-loadingicon');
    await openPanel(page, 'tt-all');
    for (const cls of ['tpl-header', 'tpl-footer', 'tpl-item', 'tpl-group', 'tpl-filtericon']) await check(cls);
    await overlay(page).locator('input[role="searchbox"]').fill('zzz');
    await check('tpl-emptyfilter');
    await page.keyboard.press('Escape');
    await expect(overlay(page)).toHaveCount(0);
    await openPanel(page, 'tt-empty');
    await check('tpl-empty');
    await page.keyboard.press('Escape');
    await expect(overlay(page)).toHaveCount(0);
    await openPanel(page, 'tt-loader');
    await page.waitForTimeout(300);
    await check('tpl-loader');
    note('templates that did not render', JSON.stringify(missing));
    expect(missing).toEqual([]);
});

test('22.1.3 · select · IME — Enter that ends an IME composition in the filter selects nothing', async ({ page }) => {
    await open(page, 'structure');
    await openPanel(page, 'st-input');
    const filter = overlay(page).locator('input[role="searchbox"]');
    await filter.fill('H');
    await page.keyboard.press('ArrowDown');
    await expect(overlay(page).locator('li[data-p-focused="true"]')).toHaveCount(1);
    // A composing Enter commits the IME candidate; it is not a choice of option.
    await filter.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true, cancelable: true })));
    await page.waitForTimeout(150);
    await expect(overlay(page)).toBeVisible();
    await expect(page.locator('#st-input')).toHaveText('structure');
});
