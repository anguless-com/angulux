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
 */
const MUST_BE_WHOLLY_VISIBLE = [{ selector: '.p-badge', why: 'a badge is centred on its host corner, so a clipping host erases most of it while leaving the DOM correct' }];

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
 * The floor. Every per-module test below is silent on a page with no badges on it, which is
 * most of them, so on its own the sweep would stay green if the probe found nothing anywhere.
 * This pins the one page whose whole subject is badges, and it is also the page both bugs were
 * reported on.
 */
test('the badge page really has badges on it, and every one of them is whole', async ({ page }) => {
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
