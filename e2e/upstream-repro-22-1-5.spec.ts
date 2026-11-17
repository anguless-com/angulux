import { expect, test, type Page } from '@playwright/test';

/**
 * Upstream reproduction probes, fourth batch: the PrimeNG 22.1.5 changelog entries (2026-11-12)
 * that name a module angulux ships, other than Select.
 *
 * Same contract as upstream-repro.spec.ts and upstream-repro-22-1.spec.ts: only the published
 * SENTENCE is taken from upstream, every scene is written from OUR source and measured in Chrome
 * (Constitution P1). Each test asserts the behaviour that is right, so a defect that reproduces
 * turns it red. A fixed defect is an ordinary test from then on; one held for later is
 * `test.fail()`, with the reason in tools/upstream/seen.json under the digest on its title.
 *
 * The probe pages are apps/verify/src/upstream-22-1-5.ts (one scene per `?case=`) and
 * apps/verify/src/upstream-zone.ts, the one zone-based page.
 *
 * MEASURED 2026-11-17, every 22.1.5 entry that names a shipped module other than Select, plus the
 * Forms entry the watcher filed out of reach: 14 reproduce and were FIXED the same day under
 * Constitution P3.c (Tooltip ten times, DatePicker, Tabs, Message, internal ngModel), 6 do not
 * (tooltipEvent both, the double fade, zone change detection, the resizer click, the cleared
 * filter state, the root-block template). Every test below asserts the right behaviour; the
 * before and after numbers are in tools/upstream/seen.json.
 */

/** A silent runtime error is still a failure — same rule as the mandatory gate. */
function watchErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
    return errors;
}

async function open(page: Page, kase: string, variant = ''): Promise<void> {
    await page.goto(`/upstream-22-1-5?case=${kase}${variant ? `&v=${variant}` : ''}`);
    await expect(page.locator(`#sec-${kase}`)).toBeVisible();
}

/** Record a number in the report, so a measurement is readable from the run without a debugger. */
function note(type: string, description: string): void {
    test.info().annotations.push({ type, description });
    console.log(`[${test.info().title.slice(0, 60)}] ${type}: ${description}`);
}

/**
 * Watch every tooltip container the page creates: each change to its inline style, with the
 * opacity, whether it was still in the document, and the time. Installed before the page loads.
 */
async function recordTooltips(page: Page): Promise<void> {
    await page.addInitScript(() => {
        type Mark = { id: number; t: number; opacity: string; display: string; connected: boolean };
        const marks: Mark[] = [];
        let next = 0;
        const w = window as unknown as { __tt: Mark[]; __ttCreated: number; __ttHover: number };
        w.__tt = marks;
        w.__ttCreated = 0;
        const watch = (el: HTMLElement) => {
            const id = next++;
            w.__ttCreated++;
            const mark = () => marks.push({ id, t: performance.now(), opacity: el.style.opacity, display: el.style.display, connected: el.isConnected });
            mark();
            new MutationObserver(mark).observe(el, { attributes: true, attributeFilter: ['style'] });
        };
        new MutationObserver((records) => {
            for (const r of records)
                for (const n of Array.from(r.addedNodes)) {
                    if (n instanceof HTMLElement && n.classList.contains('p-tooltip') && !(n as unknown as { __watched?: boolean }).__watched) {
                        (n as unknown as { __watched?: boolean }).__watched = true;
                        watch(n);
                    }
                }
        }).observe(document, { childList: true, subtree: true });
    });
}

/** Count mouseleave listeners added to and removed from tooltip containers. */
async function countContainerListeners(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const counts = { added: 0, removed: 0 };
        (window as unknown as { __ttListeners: typeof counts }).__ttListeners = counts;
        const add = EventTarget.prototype.addEventListener;
        const remove = EventTarget.prototype.removeEventListener;
        EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, ...rest: unknown[]) {
            if (type === 'mouseleave' && this instanceof HTMLElement && this.classList.contains('p-tooltip')) counts.added++;
            return (add as (...a: unknown[]) => void).call(this, type, ...rest);
        } as typeof EventTarget.prototype.addEventListener;
        EventTarget.prototype.removeEventListener = function (this: EventTarget, type: string, ...rest: unknown[]) {
            if (type === 'mouseleave' && this instanceof HTMLElement && this.classList.contains('p-tooltip')) counts.removed++;
            return (remove as (...a: unknown[]) => void).call(this, type, ...rest);
        } as typeof EventTarget.prototype.removeEventListener;
    });
}

const tooltip = (page: Page) => page.locator('.p-tooltip');

// ─── Tooltip ────────────────────────────────────────────────────────────────────────────────

test.describe('Tooltip (22.1.5)', () => {
    test('scene: a hovered target shows its tooltip above it', async ({ page }) => {
        const errors = watchErrors(page);
        await open(page, 'tooltip');
        await page.hover('#tt-hover');
        await expect(tooltip(page)).toHaveText('Hover tip');
        const target = (await page.locator('#tt-hover').boundingBox())!;
        const tip = (await tooltip(page).boundingBox())!;
        expect(tip.y + tip.height).toBeLessThanOrEqual(target.y + 1);
        expect(errors).toEqual([]);
    });

    test('22.1.5 · tooltip · aria-describedby — the target is described by its tooltip while it shows', async ({ page }) => {
        await open(page, 'tooltip');
        await page.hover('#tt-hover');
        await expect(tooltip(page)).toBeVisible();
        const id = await tooltip(page).getAttribute('id');
        note('tooltip id', String(id));
        expect(id, 'the tooltip has an id').toBeTruthy();
        await expect(page.locator('#tt-hover')).toHaveAttribute('aria-describedby', id!);
        await page.mouse.move(5, 5);
        await expect(tooltip(page)).toHaveCount(0);
        await expect(page.locator('#tt-hover')).not.toHaveAttribute('aria-describedby', /.+/);
    });

    test('22.1.5 · tooltip · both on focus — tooltipEvent both shows the tooltip when the target takes focus', async ({ page }) => {
        await open(page, 'tooltip');
        await page.mouse.move(5, 5);
        await page.focus('#tt-hover');
        await page.keyboard.press('Tab');
        await expect(page.locator('#tt-both')).toBeFocused();
        await expect(tooltip(page)).toHaveText('Both tip');
    });

    test('scene: tooltipEvent focus shows the tooltip on focus', async ({ page }) => {
        await open(page, 'tooltip');
        await page.mouse.move(5, 5);
        await page.focus('#tt-both');
        await page.keyboard.press('Tab');
        await expect(page.locator('#tt-focus')).toBeFocused();
        await expect(tooltip(page)).toHaveText('Focus tip');
    });

    for (const id of ['tt-undef-opt', 'tt-undef-input']) {
        test(`22.1.5 · tooltip · undefined option — ${id}: an undefined position keeps the default, to the right`, async ({ page }) => {
            await open(page, 'tooltip');
            await page.hover(`#${id}`);
            await expect(tooltip(page)).toBeVisible();
            const target = (await page.locator(`#${id}`).boundingBox())!;
            const tip = (await tooltip(page).boundingBox())!;
            note('target', JSON.stringify(target));
            note('tooltip', JSON.stringify(tip));
            expect(tip.x, 'the tooltip starts at the right edge of its target').toBeGreaterThanOrEqual(target.x + target.width - 1);
            expect(Math.abs(tip.y + tip.height / 2 - (target.y + target.height / 2)), 'and is centred on it vertically').toBeLessThan(3);
        });
    }

    test('22.1.5 · tooltip · links reachable by Tab — Tab from the target reaches a link inside a persistent tooltip', async ({ page }) => {
        await open(page, 'tooltip');
        await page.mouse.move(5, 5);
        await page.focus('#before-persist');
        await page.keyboard.press('Tab');
        await expect(page.locator('#tt-persist')).toBeFocused();
        await expect(page.locator('#tt-link')).toBeVisible();
        await page.keyboard.press('Tab');
        const active = await page.evaluate(() => document.activeElement?.id ?? document.activeElement?.tagName);
        note('focus after Tab', String(active));
        expect(active).toBe('tt-link');
        await expect(page.locator('#tt-link')).toBeVisible();
        // Tab out of the tooltip goes on to what follows the target, and the tooltip closes.
        await page.keyboard.press('Tab');
        await expect(page.locator('#after-persist')).toBeFocused();
        await expect(tooltip(page)).toHaveCount(0);
    });

    test('22.1.5 · tooltip · reduced motion — with prefers-reduced-motion the tooltip is opaque from the start', async ({ page }) => {
        await recordTooltips(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await open(page, 'tooltip');
        await page.hover('#tt-hover');
        await expect(tooltip(page)).toBeVisible();
        await page.waitForTimeout(400);
        const marks = await page.evaluate(() => (window as unknown as { __tt: { opacity: string; display: string }[] }).__tt);
        const visible = marks.filter((m) => m.display !== 'none' && m.opacity !== '');
        note('opacity values while shown', visible.map((m) => m.opacity).join(' '));
        expect(visible.every((m) => Number(m.opacity) >= 1)).toBe(true);
    });

    test('22.1.5 · tooltip · fade after hide — the fade-in stops when the tooltip is hidden', async ({ page }) => {
        await recordTooltips(page);
        await open(page, 'tooltip');
        await page.hover('#tt-hover');
        await expect(tooltip(page)).toBeVisible();
        await page.mouse.move(5, 5);
        await expect(tooltip(page)).toHaveCount(0);
        await page.waitForTimeout(400);
        const marks = await page.evaluate(() => (window as unknown as { __tt: { id: number; connected: boolean; opacity: string }[] }).__tt);
        // A fade still running writes a new opacity to the removed element frame after frame. The
        // observer reads isConnected when its callback runs, so a style write made just before the
        // removal (the z-index being cleared) also reads as detached; it leaves the opacity as it was.
        const fadeWrites = marks.filter((m, i) => !m.connected && i > 0 && marks[i - 1].id === m.id && marks[i - 1].opacity !== m.opacity);
        note('opacity writes on the removed container', `${fadeWrites.length} (last opacity ${fadeWrites.at(-1)?.opacity ?? '-'})`);
        expect(fadeWrites.length).toBe(0);
    });

    test('22.1.5 · tooltip · fade runs twice — one hover creates one container and fades it in once', async ({ page }) => {
        await recordTooltips(page);
        await open(page, 'tooltip');
        await page.hover('#tt-hover');
        await expect(tooltip(page)).toBeVisible();
        await page.waitForTimeout(400);
        const { created, resets, cssAnimations } = await page.evaluate(() => {
            const w = window as unknown as { __tt: { id: number; opacity: string }[]; __ttCreated: number };
            const el = document.querySelector('.p-tooltip') as HTMLElement | null;
            return {
                created: w.__ttCreated,
                resets: w.__tt.filter((m) => m.opacity === '0').length,
                cssAnimations: el ? el.getAnimations().length : -1
            };
        });
        note('containers created / fades started / CSS animations', `${created} / ${resets} / ${cssAnimations}`);
        expect(created).toBe(1);
        expect(resets).toBe(1);
        expect(cssAnimations).toBe(0);
    });

    test('22.1.5 · tooltip · inside a dialog — the tooltip shows as soon as outside one, and fades from transparent', async ({ page }) => {
        await recordTooltips(page);
        await open(page, 'tooltip-dialog');
        const measure = async (selector: string) => {
            await page.mouse.move(5, 5);
            await expect(tooltip(page)).toHaveCount(0);
            const start = await page.evaluate(() => performance.now());
            await page.hover(selector);
            await expect(tooltip(page)).toBeVisible();
            await page.waitForTimeout(400);
            return page.evaluate((t0) => {
                const marks = (window as unknown as { __tt: { id: number; t: number; opacity: string; display: string }[] }).__tt;
                const last = marks.at(-1)!.id;
                const shown = marks.find((m) => m.id === last && m.display !== 'none' && m.display !== '');
                return { delay: shown ? Math.round(shown.t - t0) : -1, opacity: shown ? Number(shown.opacity || '1') : -1 };
            }, start);
        };
        const outside = await measure('#tt-plain-outside');
        const inside = await measure('#tt-in-dialog');
        note('outside: ms to shown / opacity when shown', `${outside.delay} / ${outside.opacity}`);
        note('inside: ms to shown / opacity when shown', `${inside.delay} / ${inside.opacity}`);
        expect(inside.opacity, 'the fade starts from transparent').toBeLessThan(0.2);
        expect(inside.delay - outside.delay, 'no fixed wait inside a dialog').toBeLessThan(60);
    });

    test('22.1.5 · tooltip · container mouseleave — the listener a persistent tooltip adds is removed when it hides', async ({ page }) => {
        await countContainerListeners(page);
        await open(page, 'tooltip');
        await page.hover('#tt-persist');
        await expect(tooltip(page)).toBeVisible();
        await page.mouse.move(5, 5);
        await expect(tooltip(page)).toHaveCount(0);
        const counts = await page.evaluate(() => (window as unknown as { __ttListeners: { added: number; removed: number } }).__ttListeners);
        note('mouseleave listeners on tooltip containers: added / removed', `${counts.added} / ${counts.removed}`);
        expect(counts.added).toBeGreaterThan(0);
        expect(counts.removed).toBe(counts.added);
    });

    test('22.1.5 · tooltip · component host — a tooltip does not become the parent of the components it wraps', async ({ page }) => {
        await open(page, 'tooltip');
        await expect(page.locator('#tt-wrapped')).toBeVisible();
        const seen = await page.evaluate(() => (window as unknown as { __aglParentSeen: Record<string, string> }).__aglParentSeen);
        note('parent seen by each component', JSON.stringify(seen));
        expect(seen['host-with-tooltip']).toBe(seen['host-without-tooltip']);
        expect(seen['inputicon-with-tooltip']).toBe(seen['inputicon-without-tooltip']);
        expect(seen['inputicon-in-iconfield-with-tooltip'], 'an IconField with a tooltip is still the parent of its InputIcon').toBe(seen['inputicon-without-tooltip']);
        expect(seen['inside-a-tooltip-element'], 'an element with a tooltip is not a component parent').toBe(seen['host-without-tooltip']);
    });

    test('22.1.5 · tooltip · Trusted Types — a tooltip shows under require-trusted-types-for', async ({ page }) => {
        const errors = watchErrors(page);
        await page.route(/\/upstream-22-1-5\?case=tooltip$/, async (route) => {
            const response = await route.fetch();
            await route.fulfill({
                response,
                headers: {
                    ...response.headers(),
                    'content-security-policy': "require-trusted-types-for 'script'; trusted-types angular angular#bundler angular#unsafe-bypass vite-client 'allow-duplicates'"
                }
            });
        });
        await open(page, 'tooltip');
        const enforced = await page.evaluate(() => {
            try {
                document.createElement('div').innerHTML = '<b>x</b>';
                return false;
            } catch {
                return true;
            }
        });
        expect(enforced, 'the page enforces Trusted Types').toBe(true);
        const before = errors.length;
        await page.hover('#tt-hover');
        await expect(tooltip(page)).toHaveText('Hover tip');
        note('errors after the hover', JSON.stringify(errors.slice(before)));
        expect(errors.slice(before)).toEqual([]);
    });

    test('22.1.5 · tooltip · large nested menu — beside a menu as wide as the page, an item tooltip shows whole, next to its item, and goes with the pointer', async ({ page }) => {
        const errors = watchErrors(page);
        await open(page, 'tooltip-menu');
        // An inline TieredMenu opens a submenu on click; after that, hovering moves between them.
        const group = page.locator('#tt-menu .p-tieredmenu-item-content', { hasText: /^Group 3$/ }).first();
        await group.click();
        const item = page.locator('#tt-menu .p-tieredmenu-item-content', { hasText: /^Item 3\.2$/ }).first();
        await expect(item).toBeVisible();
        await item.hover();
        await expect(tooltip(page)).toHaveCount(1);
        await expect(tooltip(page)).toHaveText('Item tip 3.2');
        const box = (await item.boundingBox())!;
        const tip = (await tooltip(page).boundingBox())!;
        const viewport = page.viewportSize()!;
        note('item / tooltip', `${JSON.stringify(box)} / ${JSON.stringify(tip)}`);
        // The item fills the page, so there is no room to its right. The tooltip must not be squeezed
        // into the last few pixels (one word per line): it keeps one line and moves to a side that fits.
        expect(tip.height, 'one line of text').toBeLessThan(45);
        expect(tip.x).toBeGreaterThanOrEqual(0);
        expect(tip.x + tip.width).toBeLessThanOrEqual(viewport.width);
        const gap = Math.min(Math.abs(tip.y + tip.height - box.y), Math.abs(tip.y - (box.y + box.height)), Math.abs(tip.x - (box.x + box.width)), Math.abs(tip.x + tip.width - box.x));
        expect(gap, 'next to its item').toBeLessThan(14);
        // Moving to another group removes the item's tooltip. The new group's submenu can open right
        // under the pointer in a menu this wide, and an item of it may show its own tooltip as well.
        const other = page.locator('#tt-menu .p-tieredmenu-item-content', { hasText: /^Group 10$/ }).first();
        await other.hover();
        await expect(page.locator('.p-tooltip', { hasText: 'Group tip 10' })).toHaveCount(1);
        await expect(page.locator('.p-tooltip', { hasText: 'Item tip 3.2' })).toHaveCount(0);
        expect(errors).toEqual([]);
    });

    test('22.1.5 · tooltip · zone apps — a hover over a tooltip target runs no more change detection than a plain button', async ({ page }) => {
        await page.goto('/upstream-zone');
        await expect(page.locator('#sec-zone')).toBeVisible();
        expect(await page.evaluate(() => (window as unknown as { __aglZone: boolean }).__aglZone), 'the page runs on zone.js').toBe(true);
        const ticks = () => page.evaluate(() => (window as unknown as { __aglTicks: number }).__aglTicks);
        const during = async (selector: string) => {
            await page.mouse.move(5, 5);
            await page.waitForTimeout(300);
            const t0 = await ticks();
            await page.hover(selector);
            await page.waitForTimeout(400);
            await page.mouse.move(5, 5);
            await page.waitForTimeout(400);
            return (await ticks()) - t0;
        };
        const plain = await during('#zone-plain');
        const withTooltip = await during('#zone-tooltip');
        const withDelays = await during('#zone-tooltip-delay');
        note('change detection runs: plain / tooltip / tooltip with delays', `${plain} / ${withTooltip} / ${withDelays}`);
        expect(withTooltip).toBeLessThanOrEqual(plain);
        expect(withDelays).toBeLessThanOrEqual(plain);
    });
});

// ─── Other 22.1.5 entries ────────────────────────────────────────────────────────────────────

test('22.1.5 · tabs · resize — the active bar follows the active tab when the tabs are resized', async ({ page }) => {
    await open(page, 'tabs-resize');
    const measure = () =>
        page.evaluate(() => {
            const tab = document.querySelector('.p-tab-active') as HTMLElement;
            const bar = document.querySelector('.p-tablist-active-bar') as HTMLElement;
            const a = tab.getBoundingClientRect();
            const b = bar.getBoundingClientRect();
            return { tab: [Math.round(a.left), Math.round(a.width)], bar: [Math.round(b.left), Math.round(b.width)] };
        });
    const wide = await measure();
    expect(wide.bar).toEqual(wide.tab);
    await page.click('#tabs-narrow');
    await page.waitForTimeout(300);
    const narrow = await measure();
    note('wide: tab / bar', `${wide.tab} / ${wide.bar}`);
    note('narrow: tab / bar', `${narrow.tab} / ${narrow.bar}`);
    expect(narrow.tab[1]).toBeLessThan(wide.tab[1]);
    expect(narrow.bar).toEqual(narrow.tab);
});

test('22.1.5 · message · tab order — a closed message leaves the tab order', async ({ page }) => {
    await open(page, 'message-close');
    await page.click('#msg button');
    await page.waitForTimeout(800);
    const left = await page.evaluate(() => {
        const host = document.querySelector('#msg');
        const button = host?.querySelector('button') as HTMLElement | null;
        return { host: !!host, button: !!button, box: button ? button.getBoundingClientRect().height : 0 };
    });
    note('after closing: host present / button present / button height', JSON.stringify(left));
    await page.focus('#before-msg');
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName);
    note('focus after Tab', String(active));
    expect(active).toBe('after-msg');
});

test('22.1.5 · table · resizer click — a click on a column resizer without a drag neither resizes nor sorts', async ({ page }) => {
    await open(page, 'table-resize');
    const th = page.locator('#th-name');
    const before = (await th.boundingBox())!;
    const sortBefore = await th.getAttribute('aria-sort');
    const resizer = th.locator('.p-datatable-column-resizer');
    const r = (await resizer.boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);
    const after = (await th.boundingBox())!;
    const sortAfter = await th.getAttribute('aria-sort');
    note('width before / after', `${before.width} / ${after.width}`);
    note('aria-sort before / after', `${sortBefore} / ${sortAfter}`);
    expect(Math.abs(after.width - before.width)).toBeLessThan(1);
    expect(sortAfter).toBe(sortBefore);
});

for (const variant of ['row-empty-string', 'row-null', 'menu-null', 'menu-empty-list', 'row-value']) {
    test(`22.1.5 · table · empty filter state — ${variant}: a table restoring a cleared filter renders`, async ({ page }) => {
        const errors = watchErrors(page);
        await open(page, 'table-state', variant);
        await expect(page.locator('.state-row').first()).toBeVisible();
        const rows = await page.locator('.state-row').count();
        note('rows', String(rows));
        expect(rows).toBe(variant === 'row-value' ? 1 : 4);
        expect(errors).toEqual([]);
    });
}

test('22.1.5 · datepicker · after Today — Previous moves from the month Today showed', async ({ page }) => {
    await open(page, 'dp-today');
    const title = page.locator('#dp-today-inline .p-datepicker-title');
    await expect(title).toContainText('March');
    const expected = await page.evaluate(() => {
        const d = new Date();
        d.setDate(1);
        const month = (m: Date) => m.toLocaleString('en-US', { month: 'long' });
        const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        return { today: `${month(d)} ${d.getFullYear()}`, prev: `${month(prev)} ${prev.getFullYear()}` };
    });
    // Change detection runs after the click, so each title is awaited rather than read at once.
    await page.locator('#dp-today-inline .p-datepicker-buttonbar button').first().click();
    await expect(title).toHaveText(new RegExp(expected.today.replace(' ', '\\s+')));
    await page.locator('#dp-today-inline .p-datepicker-prev-button').click();
    await expect(title).toHaveText(new RegExp(expected.prev.replace(' ', '\\s+')));
    note('after Today / after Previous', `${expected.today} / ${expected.prev}`);
});

test('22.1.5 · forms · internal ngModel — components inside a form log no forms error', async ({ page }) => {
    const errors = watchErrors(page);
    const warnings: string[] = [];
    page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
    await open(page, 'forms-internal');
    await page.locator('.p-paginator .p-select').first().click();
    await page.keyboard.press('Escape');
    await page.locator('agl-multiselect').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const forms = [...errors, ...warnings].filter((t) => /NG01|ngModel|standalone/i.test(t));
    note('forms messages', JSON.stringify(forms));
    expect(forms).toEqual([]);
    expect(errors).toEqual([]);
});

test('22.1.5 · core · template root block — an item template rooted in a control-flow block renders a long list as fast', async ({ page }) => {
    const time = async (variant: string) => {
        await open(page, 'core-template', variant);
        const ms: number[] = [];
        for (let i = 0; i < 3; i++) {
            const t0 = await page.evaluate(() => performance.now());
            await page.click('#core-select');
            await expect(page.locator('.core-item')).toHaveCount(2000, { timeout: 20_000 });
            ms.push((await page.evaluate(() => performance.now())) - t0);
            await page.keyboard.press('Escape');
            await expect(page.locator('.core-item')).toHaveCount(0);
        }
        return Math.round(Math.min(...ms));
    };
    const plain = await time('plain');
    const block = await time('block');
    note('ms to render 2,000 options: plain / root block', `${plain} / ${block}`);
    expect(block).toBeLessThan(plain * 1.5 + 50);
});
