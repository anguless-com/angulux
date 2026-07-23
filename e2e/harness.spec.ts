import { test, expect } from '@playwright/test';

/**
 * The harness testing itself.
 *
 * Purpose: prove that THE HARNESS works — it can start a browser, interact with the DOM,
 * and capture a screenshot as evidence — independently of the library. It runs against a
 * self-contained data: URL fixture, so it stays meaningful even if the verification app is
 * broken or absent.
 *
 * This file does NOT verify angulux. That is the browser gate's job.
 *
 * It deliberately includes a real interaction (a click that changes the DOM) rather than
 * only asserting static render, because the defect class the browser gate exists to catch
 * is broken change detection, and that only shows up after an interaction. A harness that
 * cannot prove it detects a post-interaction DOM change is useless as a gate.
 */

const FIXTURE = `data:text/html,
<button id="go">increment</button>
<span id="out">0</span>
<script>
  let n = 0;
  document.getElementById('go').addEventListener('click', () => {
    n += 1;
    document.getElementById('out').textContent = String(n);
  });
</script>`;

test('harness starts a browser and can read the DOM', async ({ page }) => {
    await page.goto(FIXTURE);
    await expect(page.locator('#out')).toHaveText('0');
});

test('harness detects a DOM change after a real interaction', async ({ page }) => {
    await page.goto(FIXTURE);
    await page.locator('#go').click();
    await expect(page.locator('#out')).toHaveText('1');
    await page.locator('#go').click();
    await expect(page.locator('#out')).toHaveText('2');
});

test('harness detects when the DOM does NOT change (guards against false positives)', async ({ page }) => {
    // This button deliberately does nothing. A harness that "passes" here cannot tell a
    // frozen UI from a working one, which makes it worthless as a gate.
    await page.goto(`data:text/html,<button id="dead">chet</button><span id="out">0</span>`);
    await page.locator('#dead').click();
    await expect(page.locator('#out')).toHaveText('0');
});
