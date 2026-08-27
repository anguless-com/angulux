import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * The browser gate for a defect class the unit suite structurally cannot see: an element that
 * renders, holds the right text, carries the right classes, sits in the right parent — and is
 * invisible on screen because something clips it.
 *
 * Two badge bugs shipped through that hole in one day. `aglBadge` on an `<agl-button>` put a
 * correct badge inside `.p-button`, which sets `overflow: hidden` to contain the ripple ink; the
 * badge is centred on the host's corner, so three of its four quadrants were cut off and the
 * fourth was grey on grey. `aglBadge` on an `<agl-togglebutton>` failed the same way one level
 * further up. Every structural assertion about both badges passed the whole time.
 *
 * WHY THE UNIT SUITE COULD NOT CATCH IT. badge.spec.ts attaches the directive to a bare
 * `<button>Button</button>` — no `p-button` class, so no `.p-button { overflow: hidden }` rule
 * applies and there is nothing to clip. The markup under test was not the markup the library
 * hands people. A spec written that way is green whether the library works or not.
 *
 * So this gate runs against the showcase, where the markup IS what a reader copies, and asserts
 * on geometry rather than on structure: a badge must be WHOLLY visible. Not present, not
 * non-empty — wholly visible, after intersecting its rectangle with every clipping ancestor.
 * "Present" was already true when it was invisible, and "partly visible" was true too: the
 * button bug left a quarter of the badge on screen, so any `area > 0` threshold would have
 * passed it.
 */

const EVIDENCE = 'test-results/evidence';

/**
 * The module pages to sweep, and the demo sections each one must have rendered before the page
 * can be measured. Read out of the showcase's own registry rather than duplicated here: a list
 * kept by hand goes stale silently, and a gate that quietly stops covering a page is worse than
 * no gate. The showcase loads every section of a module eagerly (`Promise.all` over the
 * section loaders in module-page.ts), so waiting for the last section id is a sound
 * ready-signal — there is no scroll-triggered loading to race with.
 */
function readRegistry(): { module: string; sectionIds: string[] }[] {
    const src = readFileSync(join(__dirname, '../apps/showcase/src/doc/registry.ts'), 'utf8');
    const blocks = [...src.matchAll(/^ {4}([a-z][\w]*): \[$/gm)];

    return blocks.map((block, i) => {
        const from = block.index! + block[0].length;
        const to = i + 1 < blocks.length ? blocks[i + 1].index! : src.length;
        const sectionIds = [...src.slice(from, to).matchAll(/\bid: '([^']+)'/g)].map((m) => m[1]);

        return { module: block[1], sectionIds };
    });
}

const MODULES = readRegistry();

/**
 * Things the library draws that are meaningless when partly cut off. Kept as a table because
 * the clip probe is general and the interesting work is deciding what to point it at; adding a
 * decoration here is one line, and each entry has to say why being cut off is a defect rather
 * than a layout choice.
 *
 * `clipper` is not documentation — it is what the teeth test below sets `overflow: hidden` on,
 * to prove the row can fail at all. A decoration that no ancestor can clip is a row that will be
 * green forever, which reads like cover and is not, and the only way to tell the two apart is to
 * try. `floor` is the second half of the same idea: a selector that matches nothing sweeps a
 * page happily and reports success.
 *
 * REJECTED, and recorded because the reasoning is the useful part. `.p-tablist-active-bar` — the
 * 1px mark under the selected tab — looks like the perfect candidate: it is drawn deliberately
 * outside its containing block, at `inset-block-end: -1px`, inside a `.p-tablist` that sets
 * `overflow: hidden`. It was measured rather than assumed, and forcing `overflow: hidden` onto
 * `.p-tablist-tab-list`, `.p-tablist-content` and `.p-tablist` in turn left the ratio at exactly
 * 1.000 every time. Nothing above it can cut it, so the row could never have gone red. Also
 * rejected: every overlay-hosted decoration (absent at rest — the gate visits, it does not
 * interact), `.p-inputicon` and `.p-toggleswitch-handle` (inset safely inside their own hosts).
 */
const MUST_BE_WHOLLY_VISIBLE = [
    {
        selector: '.p-badge',
        module: 'badge',
        clipper: '.p-button',
        floor: 11,
        why: 'a badge is centred on its host corner, so a clipping host erases most of it while leaving the DOM correct'
    },
    {
        selector: '.p-colorpicker-hue-handle',
        module: 'colorpicker',
        clipper: '.p-colorpicker-hue',
        floor: 1,
        why: 'the hue handle is 21px wide across a 17px strip and hangs 2px past each edge by construction, so it is exactly the shape a clipping ancestor would eat — clipping .p-colorpicker-hue takes it to 0.81 and .p-colorpicker-content takes it to 0, and the handle is the only thing telling the user which hue is selected'
    }
];

type Measurement = { ratio: number; clippedBy: string | null; label: string };

/**
 * Runs in the page. For each match, intersect the element's rectangle with the rectangle of
 * every ancestor that clips, and report how much of it survives. `overflow: visible` is the
 * only value that does not clip — `hidden`, `clip`, `auto` and `scroll` all do — and each axis
 * is treated separately, because `overflow-x: hidden` with `overflow-y: visible` is a real and
 * common combination.
 */
const MEASURE = (selector: string): Measurement[] => {
    const out: Measurement[] = [];

    for (const el of Array.from(document.querySelectorAll(selector))) {
        const own = el.getBoundingClientRect();
        const label = `${el.tagName.toLowerCase()}.${el.className}${el.textContent?.trim() ? ` "${el.textContent.trim().slice(0, 12)}"` : ''}`;

        if (own.width === 0 || own.height === 0) {
            out.push({ ratio: 0, clippedBy: null, label: `${label} (zero size)` });
            continue;
        }

        let [left, top, right, bottom] = [own.left, own.top, own.right, own.bottom];
        let clippedBy: string | null = null;

        for (let a = el.parentElement; a; a = a.parentElement) {
            const cs = getComputedStyle(a);
            const clipsX = cs.overflowX !== 'visible';
            const clipsY = cs.overflowY !== 'visible';

            if (!clipsX && !clipsY) continue;

            const box = a.getBoundingClientRect();
            const next = [clipsX ? Math.max(left, box.left) : left, clipsY ? Math.max(top, box.top) : top, clipsX ? Math.min(right, box.right) : right, clipsY ? Math.min(bottom, box.bottom) : bottom];

            if (clippedBy === null && (next[0] !== left || next[1] !== top || next[2] !== right || next[3] !== bottom)) {
                clippedBy = `${a.tagName.toLowerCase()}.${a.className} (overflow ${cs.overflow})`;
            }

            [left, top, right, bottom] = next;
        }

        const survives = Math.max(0, right - left) * Math.max(0, bottom - top);

        out.push({ ratio: survives / (own.width * own.height), clippedBy, label });
    }

    return out;
};

/** An uncaught exception on a demo page is a failure even when the page still looks right. */
function watchErrors(page: Page): string[] {
    const errors: string[] = [];

    page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

    return errors;
}

async function openModule(page: Page, module: string, sectionIds: string[]): Promise<void> {
    await page.goto(`/${module}`);

    for (const id of sectionIds) {
        await expect(page.locator(`#${id}`)).toBeVisible();
    }
}

/**
 * The probe testing itself, on a fixture that reproduces the exact geometry of the button bug:
 * a 20px square centred on the corner of a host that clips, which leaves precisely one quadrant
 * on screen. Without this, a probe that returned 1 for everything would make every assertion
 * below pass and the gate would be decoration.
 */
test.describe('the clip probe', () => {
    // Colours are named rather than hex on purpose: `#` opens the fragment of a data: URL, so a
    // single `background:#eee` silently truncates the fixture and every probe below then runs
    // against an empty document.
    const FIXTURE = `data:text/html,
        <div style="overflow:hidden;position:relative;width:120px;height:40px;background:gainsboro">
          <span id="swallowed" style="position:absolute;top:0;inset-inline-end:0;transform:translate(50%,-50%);width:20px;height:20px;background:red"></span>
        </div>
        <div style="overflow:visible;position:relative;width:120px;height:40px;background:gainsboro">
          <span id="whole" style="position:absolute;top:0;inset-inline-end:0;transform:translate(50%,-50%);width:20px;height:20px;background:green"></span>
        </div>
        <span id="plain" style="display:inline-block;width:20px;height:20px;background:blue"></span>`;

    test('sees a decoration a clipping host has cut down to one quadrant', async ({ page }) => {
        await page.goto(FIXTURE);

        const [swallowed] = await page.evaluate(MEASURE, '#swallowed');

        expect(swallowed.ratio).toBeCloseTo(0.25, 2);
        expect(swallowed.clippedBy).toContain('overflow hidden');
    });

    test('does not cry clip over an identical decoration nothing clips', async ({ page }) => {
        await page.goto(FIXTURE);

        const [whole] = await page.evaluate(MEASURE, '#whole');
        const [plain] = await page.evaluate(MEASURE, '#plain');

        expect(whole.ratio).toBe(1);
        expect(whole.clippedBy).toBeNull();
        expect(plain.ratio).toBe(1);
    });
});

/**
 * Every row of the table has to be shown capable of failing, on the page it is meant to guard.
 * Two ways a row can be worthless, and this covers both: it matches nothing (so the sweep visits
 * a page and reports success over an empty set), or nothing above it can clip it (so the ratio is
 * pinned at 1 whatever happens downstream). The second one is not hypothetical — the tab list's
 * active bar looked like the strongest candidate in the library and turned out to be exactly this,
 * which is why it is a comment on the table instead of a row in it.
 */
test.describe('the table is pointed at things the probe can actually see', () => {
    for (const entry of MUST_BE_WHOLLY_VISIBLE) {
        test(`${entry.selector} — matches on /${entry.module}, and goes red when ${entry.clipper} clips`, async ({ page }) => {
            const target = MODULES.find((m) => m.module === entry.module)!;

            await openModule(page, target.module, target.sectionIds);
            await expect(page.locator(entry.selector)).toHaveCount(entry.floor);

            const before = await page.evaluate(MEASURE, entry.selector);

            expect(Math.min(...before.map((m) => m.ratio))).toBe(1);

            // Mutate the live page rather than the stylesheet: this has to prove the PROBE can
            // see a clip on this particular geometry, and the cheapest honest way is to introduce
            // one. No restore — the page is thrown away with the test.
            const clippers = await page.evaluate((clipper) => {
                const found = Array.from(document.querySelectorAll<HTMLElement>(clipper));

                found.forEach((el) => (el.style.overflow = 'hidden'));

                return found.length;
            }, entry.clipper);

            expect(clippers).toBeGreaterThan(0);

            const after = await page.evaluate(MEASURE, entry.selector);

            expect(Math.min(...after.map((m) => m.ratio))).toBeLessThan(1);
        });
    }
});

/**
 * The floor for the badge, plus the thing the clip probe structurally cannot see: a decoration
 * that is wholly visible in the wrong place. Both bugs before this one were about a badge being
 * erased; the one after them was about a badge sitting 5px inside the control because the
 * directive anchored to an inner span rather than to the control itself. A ratio of 1.000 is true
 * of both the fixed and the misplaced badge.
 *
 * Measured against the CONTROL's corner, deliberately not against the element carrying
 * `.p-overlay-badge` — that element IS the anchor, so measuring against it would make the
 * assertion true by construction no matter which element the directive picked.
 */
test('the badge page really has badges on it, every one whole and on the corner it belongs to', async ({ page }) => {
    const errors = watchErrors(page);
    const badge = MODULES.find((m) => m.module === 'badge')!;

    await openModule(page, badge.module, badge.sectionIds);
    // The directive builds its badge behind an isPlatformBrowser guard, so on the Directive
    // section the badge exists only after hydration — waiting on a count, not on a load state.
    await expect(page.locator('.p-badge')).toHaveCount(11);

    const measured = await page.evaluate(MEASURE, '.p-badge');

    for (const m of measured) {
        expect(`${m.label} — ${(m.ratio * 100).toFixed(0)}% visible, clipped by ${m.clippedBy ?? 'nothing'}`).toContain('100% visible');
    }

    const placed = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#badge-directive .p-badge')).map((badgeEl) => {
            const control = badgeEl.closest('.p-button, .p-togglebutton') ?? badgeEl.parentElement!;
            const own = badgeEl.getBoundingClientRect();
            const box = control.getBoundingClientRect();

            return {
                on: control.tagName.toLowerCase(),
                text: badgeEl.textContent?.trim(),
                dx: Math.round(own.left + own.width / 2 - box.right),
                dy: Math.round(own.top + own.height / 2 - box.top)
            };
        })
    );

    // Three host shapes — an inner-root component, a self-styled-host component and a plain <i> —
    // and the badge has to land on the same corner of all three. The residual 1px on the two
    // controls is their border: the corner an overlay badge is centred on is the border-box
    // corner, and a badge centred on the padding-box corner of a bordered control reads as
    // off-centre against the visual edge. 2 is the tolerance, not the expectation.
    expect(placed).toHaveLength(3);

    for (const p of placed) {
        expect(`${p.on} badge "${p.text}" at dx=${p.dx} dy=${p.dy}`).toMatch(/dx=-?[01] dy=-?[01]$/);
    }

    await page.screenshot({ path: `${EVIDENCE}/badge-page.png`, fullPage: true });
    expect(errors).toEqual([]);
});

test.describe('every demo page', () => {
    for (const { module, sectionIds } of MODULES) {
        test(`${module} — nothing the library draws is clipped away`, async ({ page }) => {
            const errors = watchErrors(page);

            await openModule(page, module, sectionIds);

            for (const { selector, why } of MUST_BE_WHOLLY_VISIBLE) {
                for (const m of await page.evaluate(MEASURE, selector)) {
                    expect(`${m.label} — ${(m.ratio * 100).toFixed(0)}% visible, clipped by ${m.clippedBy ?? 'nothing'} — ${why}`).toContain('100% visible');
                }
            }

            expect(errors).toEqual([]);
        });
    }
});
