import { defineConfig, devices } from '@playwright/test';

/**
 * Browser verification harness.
 *
 * Why it had to be built from scratch: the upstream project ships no end-to-end suite at
 * all — no `e2e/` directory, no Playwright or Cypress in devDependencies, and its `"e2e":
 * "ng e2e"` script fails on a clean checkout. Inheriting the library did not inherit a way
 * to prove the library still works.
 *
 * Why it lives at the workspace level: it is our tool, not inherited code. Keeping it
 * separate means inherited sources stay byte-comparable against upstream for diffing, and
 * the harness evolves independently.
 *
 * This is a mandatory gate. Scope changes, change-detection strategies and icon dependency
 * swaps all alter runtime and DOM behaviour, and a green build is not evidence for that
 * class of change.
 */
export default defineConfig({
    testDir: '.',
    /* Screenshots are the evidence, so they are kept on pass as well as on failure.
       They land under the gitignored `test-results/` directory: the evidence here is a
       command anyone can re-run, not a binary committed to the tree. */
    outputDir: '../test-results/evidence',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:4210',
        screenshot: 'on',
        trace: 'retain-on-failure'
    },
    /* Playwright starts and stops the verification app itself. It deliberately does not
       rely on an already-running server: a mandatory gate that depends on manual state can
       go green for the wrong reason. `reuseExistingServer` is enabled outside CI only, to
       keep the local development loop fast. */
    webServer: {
        command: 'npx ng serve verify --port 4210',
        cwd: '../apps/verify',
        url: 'http://localhost:4210',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});
