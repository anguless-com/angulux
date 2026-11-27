import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { hydrated } from './hydrated';

/**
 * Overlays driven from the keyboard on the showcase: when one closes, focus goes back to the control
 * that opened it.
 *
 * A keyboard user who opens a menu and closes it again expects to carry on from where they were.
 * When focus is dropped instead, it lands on the page body and the next Tab starts from the top of
 * the page (WCAG 2.4.3, Focus Order; the WAI-ARIA menu button and dialog patterns both return focus
 * to the opener).
 *
 * The other way round, too: an overlay that a click opens again once it has been closed opens again
 * from the keyboard (WCAG 2.1.1, Keyboard).
 */

test('SplitButton: closing its menu from the keyboard puts focus back on the dropdown button', async ({ page }) => {
    await page.goto('/splitbutton');
    await hydrated(page);

    const dropdown = page.locator('agl-splitbutton-basic-doc').getByRole('button', { name: 'More actions' });
    const menu = page.getByRole('menu');

    // Escape.
    await dropdown.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(dropdown).toBeFocused();

    // An item chosen with Enter.
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(dropdown).toBeFocused();
});

test('Dialog: closing it puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/dialog');
    await hydrated(page);

    const show = page.locator('agl-dialog-basic-doc').getByRole('button', { name: 'Show' });
    const dialog = page.getByRole('dialog');

    await show.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(show).toBeFocused();
});

test('Dialog, modal: closing it, by Escape or by its Cancel button, puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/dialog');
    await hydrated(page);

    const show = page.locator('agl-dialog-modal-doc').getByRole('button', { name: 'Show modal' });
    const dialog = page.getByRole('dialog');

    // Escape.
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(show).toBeFocused();

    // Cancel, which has focus when the dialog opens.
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(show).toBeFocused();
});

test('Drawer: closing it, by Escape or by its close button, puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/drawer');
    await hydrated(page);

    const open = page.locator('agl-drawer-basic-doc').getByRole('button', { name: 'Open' });
    const drawer = page.getByRole('dialog');

    // Escape.
    await open.focus();
    await page.keyboard.press('Enter');
    await expect(drawer.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(open).toBeFocused();

    // The close button, which has focus when the drawer opens.
    await page.keyboard.press('Enter');
    await expect(drawer.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(drawer).toBeHidden();
    await expect(open).toBeFocused();
});

test('ConfirmDialog: answering or dismissing it puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/confirmdialog');
    await hydrated(page);

    const del = page.locator('agl-confirmdialog-basic-doc').getByRole('button', { name: 'Delete' });
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));

    // Escape.
    await del.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'No' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(del).toBeFocused();

    // No, which has focus when the dialog opens.
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'No' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(del).toBeFocused();
});

test('DatePicker: once Escape has closed it, ArrowDown or Alt+ArrowDown opens it again', async ({ page }) => {
    await page.goto('/datepicker');
    await hydrated(page);

    const input = page.locator('agl-datepicker-basic-doc').getByRole('combobox', { name: 'Date' });
    const panel = page.getByRole('dialog', { name: 'Choose Date' });

    // Focus opens it; Escape closes it and leaves focus on the input. A click opens it again from
    // here, and until now no key did: the keyboard had to leave the input and come back.
    await input.focus();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(panel).toBeVisible();
    await expect(input).toBeFocused();

    // With it open, ArrowDown goes on into the calendar, as it did when focus opened it.
    await page.keyboard.press('ArrowDown');
    await expect(panel.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(panel).toBeVisible();
    await expect(input).toBeFocused();
});

test('Tooltip: keyboard focus shows it and describes the field with it, and moving on hides it', async ({ page }) => {
    await page.goto('/tooltip');
    await hydrated(page);

    // Shown on hover only, the tooltip never reached a keyboard user (WCAG 2.1.1).
    const input = page.locator('agl-tooltip-basic-doc input');
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toHaveCount(0);

    await input.focus();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Enter your username');
    await expect(input).toHaveAccessibleDescription('Enter your username');

    await page.keyboard.press('Tab');
    await expect(tooltip).toHaveCount(0);
});

test('Tooltip: focus a script moves after a mouse click shows none, and keyboard focus does', async ({ page }) => {
    await page.goto('/tooltip');
    await hydrated(page);

    // A dialog or overlay that focuses a control as it opens moves focus by script. After a mouse
    // click that is not keyboard focus (the control does not match :focus-visible), and the control's
    // tooltip appeared in front of a mouse user who never asked for it.
    const demo = page.locator('agl-tooltip-position-doc');
    const right = demo.getByRole('button', { name: 'Right' });
    const top = demo.getByRole('button', { name: 'Top' });
    const tooltip = page.getByRole('tooltip');

    await demo.locator('.card').click({ position: { x: 4, y: 4 } });
    await right.evaluate((el) => (el as HTMLElement).focus());
    await expect(right).toBeFocused();
    expect(await right.evaluate((el) => el.matches(':focus-visible')), 'the browser counts this focus as not from the keyboard').toBe(false);
    // With no showDelay a tooltip is shown while the focus event is handled, so it would be here now.
    await expect(tooltip).toHaveCount(0);

    // Tab is keyboard focus: the next button shows its tooltip.
    await page.keyboard.press('Tab');
    await expect(top).toBeFocused();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('Add');
});

test('ColorPicker: Space opens it, and Escape, Space or Tab closes it', async ({ page }) => {
    await page.goto('/colorpicker');
    await hydrated(page);

    const input = page.locator('agl-colorpicker-basic-doc').getByRole('textbox');
    // The inline demo's panel is on screen all the time, so only the popup one is counted. A sweep
    // that counted both once reported this picker as one that no key closes.
    const panel = page.locator('.p-colorpicker-panel:not(agl-colorpicker-inline-doc *)');

    // Escape, with focus left on the input.
    await input.focus();
    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();

    // Space again.
    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Space');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();

    // Tab, which moves on.
    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(panel).toBeHidden();
    await expect(input).not.toBeFocused();
});

// The colour area and the hue bar used to take the pointer only (WCAG 2.1.1). Both are sliders now.
test('ColorPicker: ArrowDown moves into the open panel, the arrow keys set the colour and the hue, and Escape goes back to the input', async ({ page }) => {
    await page.goto('/colorpicker');
    await hydrated(page);

    const demo = page.locator('agl-colorpicker-basic-doc');
    const input = demo.getByRole('textbox');
    const value = demo.locator('span');
    const panel = page.locator('.p-colorpicker-panel:not(agl-colorpicker-inline-doc *)');
    const area = panel.getByRole('slider', { name: 'Saturation and brightness' });
    const hue = panel.getByRole('slider', { name: 'Hue' });
    const start = (await value.textContent())!.trim();

    // ArrowDown opens it, as in DatePicker, and a second ArrowDown moves into it.
    await input.focus();
    await page.keyboard.press('ArrowDown');
    await expect(panel).toBeVisible();
    await expect(input).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(area).toBeFocused();

    // Saturation down by 10: the colour changes, and the slider reads it out as its hex code.
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(value).not.toHaveText(start);
    const afterArea = (await value.textContent())!.trim();
    await expect(area).toHaveAttribute('aria-valuetext', afterArea.startsWith('#') ? afterArea : `#${afterArea}`);

    // Tab moves to the hue bar; Shift+ArrowUp raises the hue by 10.
    await page.keyboard.press('Tab');
    await expect(hue).toBeFocused();
    const hueBefore = Number(await hue.getAttribute('aria-valuenow'));
    await page.keyboard.press('Shift+ArrowUp');
    await expect(hue).toHaveAttribute('aria-valuenow', String(hueBefore + 10));
    await expect(value).not.toHaveText(afterArea);

    // Tab stays in the open panel; Escape closes it with focus back on the input.
    await page.keyboard.press('Tab');
    await expect(area).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(input).toBeFocused();
});

test('ColorPicker, inline: Tab reaches its colour area and hue bar, and the arrow keys change the colour', async ({ page }) => {
    await page.goto('/colorpicker');
    await hydrated(page);

    const inline = page.locator('agl-colorpicker-inline-doc');
    const area = inline.getByRole('slider', { name: 'Saturation and brightness' });
    const hue = inline.getByRole('slider', { name: 'Hue' });

    await area.focus();
    const before = await area.getAttribute('aria-valuetext');
    await page.keyboard.press('ArrowUp');
    await expect(area).not.toHaveAttribute('aria-valuetext', before ?? '');

    await page.keyboard.press('Tab');
    await expect(hue).toBeFocused();
    const hueBefore = Number(await hue.getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowDown');
    await expect(hue).toHaveAttribute('aria-valuenow', String(hueBefore - 1));
});

test('Password: Tab reaches the show-password toggle after the field, and Enter and Space show and hide what was typed', async ({ page }) => {
    await page.goto('/password');
    await hydrated(page);

    const demo = page.locator('agl-password-togglemask-doc');
    const input = demo.locator('input');
    const toggle = demo.getByRole('button', { name: 'Show password' });

    await input.focus();
    await page.keyboard.type('secret');
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await page.keyboard.press('Enter');
    await expect(input).toHaveAttribute('type', 'text');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('Space');
    await expect(input).toHaveAttribute('type', 'password');
    await expect(toggle).toBeFocused();
});

test('Select: Enter, Space, ArrowDown and Alt+ArrowDown open it, the arrows move the active option, Enter chooses, Escape closes', async ({ page }) => {
    await page.goto('/select');
    await hydrated(page);

    const combobox = page.locator('agl-select-basic-doc [role="combobox"]');
    const panel = page.locator('.p-select-overlay');
    await expect(panel).toHaveCount(0);

    // Each key opens it; Escape closes it; focus never leaves the combobox.
    await combobox.focus();
    for (const key of ['Enter', 'Space', 'ArrowDown', 'Alt+ArrowDown']) {
        await page.keyboard.press(key);
        await expect(panel, `${key} opens it`).toBeVisible();
        await expect(combobox).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(panel, `Escape closes it after ${key}`).toBeHidden();
        await expect(combobox).toBeFocused();
    }

    // The arrows move the active option, which the combobox names; Enter chooses it and closes.
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    const before = await combobox.getAttribute('aria-activedescendant');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => combobox.getAttribute('aria-activedescendant'), 'ArrowDown moves the active option').not.toBe(before);
    const activeId = await combobox.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    const chosen = (await page.locator(`[id="${activeId}"]`).textContent())?.trim() ?? '';
    expect(chosen).not.toBe('');
    await page.keyboard.press('Enter');
    await expect(panel).toBeHidden();
    await expect(combobox).toBeFocused();
    await expect(combobox).toHaveText(chosen);
});

test('MultiSelect: Enter opens it and Escape closes it, with focus back on the combobox', async ({ page }) => {
    await page.goto('/multiselect');
    await hydrated(page);

    // Only opening, closing and where focus ends up. What each option exposes is not checked here:
    // its nested checkbox is an open question (see the MultiSelect case in showcase-open-overlays).
    const combobox = page.locator('agl-multiselect-basic-doc [role="combobox"]');
    const panel = page.locator('.p-multiselect-overlay');
    await expect(panel).toHaveCount(0);

    await combobox.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(combobox).toBeFocused();
});

test('Menu popup: focus moves into it, and Escape or an item chosen with Enter puts it back on the button', async ({ page }) => {
    await page.goto('/menu');
    await hydrated(page);

    const show = page.locator('agl-menu-popup-doc').getByRole('button', { name: 'Show' });
    // The page also shows an inline menu, which is a role="menu" list all the time.
    const menu = page.locator('.p-menu-overlay [role="menu"]');
    await expect(menu).toHaveCount(0);

    // Escape.
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(show).toBeFocused();

    // An item chosen with Enter.
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(show).toBeFocused();
});

test('Popover: Escape closes it, with focus still on the button that opened it', async ({ page }) => {
    await page.goto('/popover');
    await hydrated(page);

    const show = page.locator('agl-popover-basic-doc').getByRole('button', { name: 'Show' });
    const panel = page.locator('.p-popover');
    await expect(panel).toHaveCount(0);

    await show.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(show).toBeFocused();
});

test('Dialog, modal: Tab and Shift+Tab keep focus inside it', async ({ page }) => {
    await page.goto('/dialog');
    await hydrated(page);

    const show = page.locator('agl-dialog-modal-doc').getByRole('button', { name: 'Show modal' });
    const dialog = page.getByRole('dialog');

    await show.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    // Twelve presses each way go round the dialog's three buttons several times.
    for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 1; i <= 12; i++) {
            await page.keyboard.press(key);
            await expect(dialog.locator(':focus'), `${key} ×${i} keeps focus inside`).toHaveCount(1);
        }
    }
});

test('TieredMenu popup: closing it from the keyboard puts focus back on the button that opened it', async ({ page }) => {
    await page.goto('/tieredmenu');
    await hydrated(page);

    const show = page.locator('agl-tieredmenu-popup-doc').getByRole('button', { name: 'Show' });
    // The root list; a submenu is a second list inside it.
    const menu = page.locator('.p-tieredmenu-overlay [role="menu"]').first();

    // Escape.
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(show).toBeFocused();

    // File > Open, chosen with Enter.
    await page.keyboard.press('Enter');
    await expect(menu).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('menuitem', { name: 'Open' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(show).toBeFocused();
});

test('Toast: keyboard focus on a message keeps it past its life, and it closes once focus leaves', async ({ page }) => {
    await page.goto('/toast');
    await hydrated(page);

    const demo = page.locator('agl-toast-basic-doc');
    const show = demo.getByRole('button', { name: 'Show' });
    const message = demo.locator('[role="alert"]');

    await show.focus();
    await page.keyboard.press('Enter');
    await expect(message).toHaveCount(1);
    await page.keyboard.press('Shift+Tab');
    await expect(message.getByRole('button')).toBeFocused();

    // The demo's life is the default 3000 ms; with focus in the message it has to outlast that.
    await page.waitForTimeout(4000);
    await expect(message).toHaveCount(1);

    await show.focus();
    await expect(message).toHaveCount(0, { timeout: 6000 });
});

/** axe over one demo, with the state a key has just put it in: what the sweep at rest cannot see. */
async function axeViolations(page: Page, demo: string) {
    const result = await new AxeBuilder({ page }).include(demo).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();

    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test('Table, cell editing: Tab reaches each editable cell, Enter or F2 opens its editor, and Enter or Escape closes it with focus back on the cell', async ({ page }) => {
    await page.goto('/table');
    await hydrated(page);

    const demo = page.locator('agl-table-celledit-doc');
    const name = demo.getByRole('cell', { name: 'Bamboo Watch' });
    const quantity = name.locator('xpath=following-sibling::td[1]');

    // An editable cell is a tab stop and the code cell is not, so Tab goes from one editable cell to the next.
    // (Not from a click on the code cell: on the site, a click there focuses the page's main element.)
    await expect(demo.getByRole('cell', { name: 'f230fh0g3' })).not.toHaveAttribute('tabindex');
    await name.focus();
    await page.keyboard.press('Tab');
    await expect(quantity).toBeFocused();
    await expect(quantity).not.toHaveCSS('outline-style', 'none');

    // F2 opens the quantity editor; Enter closes it with the new value.
    await page.keyboard.press('F2');
    const quantityInput = demo.getByRole('spinbutton', { name: 'Quantity' });
    await expect(quantityInput).toBeFocused();
    await quantityInput.fill('30');
    await page.keyboard.press('Enter');
    await expect(quantityInput).toHaveCount(0);
    await expect(quantity).toBeFocused();
    await expect(quantity).toHaveText('30');

    // Enter opens the name editor, which axe finds named; Escape closes it.
    await page.keyboard.press('Shift+Tab');
    await expect(name).toBeFocused();
    await page.keyboard.press('Enter');
    const nameInput = demo.getByRole('textbox', { name: 'Name' });
    await expect(nameInput).toBeFocused();
    expect(await axeViolations(page, 'agl-table-celledit-doc')).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(nameInput).toHaveCount(0);
    await expect(name).toBeFocused();
});

test('TreeTable, cell editing: Tab reaches each editable cell, Enter or F2 opens its editor, and Enter or Escape closes it with focus back on the cell', async ({ page }) => {
    await page.goto('/treetable');
    await hydrated(page);

    const demo = page.locator('agl-treetable-celledit-doc');
    const row = demo.getByRole('row', { name: /Documents/ });
    const size = row.getByRole('gridcell').nth(1);
    const type = row.getByRole('gridcell').nth(2);

    // From the row's toggler, Tab lands on the size cell, then on the type cell.
    await expect(size).toHaveText('75kb');
    await row.getByRole('button').focus();
    await page.keyboard.press('Tab');
    await expect(size).toBeFocused();
    await expect(size).not.toHaveCSS('outline-style', 'none');

    // Enter opens the size editor; Enter closes it with the new value.
    await page.keyboard.press('Enter');
    const sizeInput = demo.getByRole('textbox', { name: 'Size' });
    await expect(sizeInput).toBeFocused();
    await sizeInput.fill('80kb');
    await page.keyboard.press('Enter');
    await expect(sizeInput).toHaveCount(0);
    await expect(size).toBeFocused();
    await expect(size).toHaveText('80kb');

    // F2 opens the type editor, which axe finds named; Escape closes it.
    await page.keyboard.press('Tab');
    await expect(type).toBeFocused();
    await page.keyboard.press('F2');
    const typeInput = demo.getByRole('textbox', { name: 'Type' });
    await expect(typeInput).toBeFocused();
    expect(await axeViolations(page, 'agl-treetable-celledit-doc')).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(typeInput).toHaveCount(0);
    await expect(type).toBeFocused();
});

test('Table, double-click selection: the rows take focus, the arrows move between them, and Enter or Space selects one, as a double click does', async ({ page }) => {
    await page.goto('/table');
    await hydrated(page);

    const demo = page.locator('agl-table-doubleclick-doc');
    const row = (name: string) => demo.getByRole('row', { name: new RegExp(`^${name} `) });
    const selected = demo.getByText(/^Selected:/);

    await row('Bamboo Watch').focus();
    await page.keyboard.press('ArrowDown');
    await expect(row('Black Watch')).toBeFocused();
    await expect(row('Black Watch')).not.toHaveCSS('outline-style', 'none');
    await page.keyboard.press('Enter');
    await expect(selected).toHaveText('Selected: Black Watch');

    await page.keyboard.press('ArrowDown');
    await expect(row('Blue Band')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(selected).toHaveText('Selected: Blue Band');
    expect(await axeViolations(page, 'agl-table-doubleclick-doc')).toEqual([]);

    // Once a row is selected, it is the one tab stop among the rows.
    await expect(row('Blue Band')).toHaveAttribute('tabindex', '0');
    await expect(row('Bamboo Watch')).toHaveAttribute('tabindex', '-1');
    await expect(row('Bracelet')).toHaveAttribute('tabindex', '-1');

    // A double click still selects.
    await row('Bracelet').dblclick();
    await expect(selected).toHaveText('Selected: Bracelet');
});

test('TreeTable, double-click selection: Enter or Space on a focused row selects it, as a double click does', async ({ page }) => {
    await page.goto('/treetable');
    await hydrated(page);

    const demo = page.locator('agl-treetable-doubleclick-doc');
    const row = (name: string) => demo.getByRole('row', { name: new RegExp(`${name} `) });
    const selected = demo.getByText(/^Selected:/);

    await row('Documents').focus();
    await page.keyboard.press('Enter');
    await expect(selected).toHaveText('Selected: Documents');

    await page.keyboard.press('ArrowDown');
    await expect(row('Pictures')).toBeFocused();
    await expect(row('Pictures')).not.toHaveCSS('outline-style', 'none');
    await page.keyboard.press('Space');
    await expect(selected).toHaveText('Selected: Pictures');
    expect(await axeViolations(page, 'agl-treetable-doubleclick-doc')).toEqual([]);

    // A double click still selects.
    await row('Documents').dblclick();
    await expect(selected).toHaveText('Selected: Documents');
});

test('Table, column resizing: each resizer is a named tab stop that reports its column width, and the arrow keys resize the column by 10 px', async ({ page }) => {
    await page.goto('/table');
    await hydrated(page);

    const demo = page.locator('agl-table-resize-doc');
    const code = demo.getByRole('columnheader', { name: /^Code / });
    const name = demo.getByRole('columnheader', { name: /^Name / });
    const codeResizer = code.getByRole('separator', { name: 'Resize column' });
    const nameResizer = name.getByRole('separator', { name: 'Resize column' });
    const width = async () => (await code.boundingBox())!.width;

    // Tab goes from one resizer to the next, and shows the focus ring.
    await codeResizer.focus();
    await page.keyboard.press('Tab');
    await expect(nameResizer).toBeFocused();
    await expect(nameResizer).not.toHaveCSS('outline-style', 'none');
    await page.keyboard.press('Shift+Tab');
    await expect(codeResizer).toBeFocused();
    expect(Number(await codeResizer.getAttribute('aria-valuenow'))).toBeCloseTo(await width(), -1);
    expect(await axeViolations(page, 'agl-table-resize-doc')).toEqual([]);

    const before = await width();
    await page.keyboard.press('ArrowRight');
    await expect.poll(width).toBeCloseTo(before + 10, 0);
    expect(Number(await codeResizer.getAttribute('aria-valuenow'))).toBeCloseTo(before + 10, -1);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(width).toBeCloseTo(before, 0);

    // In fit mode the last column has no next column to give or take width, so its resizer is hidden and takes no focus.
    await expect(demo.getByRole('columnheader', { name: /^Category/ }).getByRole('separator', { includeHidden: true })).toBeHidden();
});

test('TreeTable, column resizing: each resizer is a named tab stop, and the arrow keys widen and narrow its column by 10 px', async ({ page }) => {
    await page.goto('/treetable');
    await hydrated(page);

    const demo = page.locator('agl-treetable-resize-doc');
    const name = demo.getByRole('columnheader', { name: /^Name / });
    const size = demo.getByRole('columnheader', { name: /^Size / });
    const nameResizer = name.getByRole('separator', { name: 'Resize column' });
    const sizeResizer = size.getByRole('separator', { name: 'Resize column' });
    const width = async () => (await size.boundingBox())!.width;

    await nameResizer.focus();
    await page.keyboard.press('Tab');
    await expect(sizeResizer).toBeFocused();
    await expect(sizeResizer).not.toHaveCSS('outline-style', 'none');
    expect(await axeViolations(page, 'agl-treetable-resize-doc')).toEqual([]);

    const before = await width();
    await page.keyboard.press('ArrowRight');
    await expect.poll(width).toBeCloseTo(before + 10, 0);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(width).toBeCloseTo(before, 0);
});
