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
    /* `baseURL` is set per project rather than here: the two gates run against two different
       apps on two different ports, and a shared default would silently be wrong for one. */
    use: {
        screenshot: 'on',
        trace: 'retain-on-failure',
        /* Pin the touch capability the device profile only claims.

           Both projects run `devices['Desktop Chrome']`, which sets `hasTouch: false`. That turns
           into `Emulation.setTouchEmulationEnabled({ enabled: false })`, which disables touch
           EMULATION — it restores the platform default rather than forcing one. On a Windows
           laptop with an integrated digitizer the platform default is `navigator.maxTouchPoints:
           10`, so a gate declaring a touchless desktop was running on a touch device.

           That is not cosmetic. `isTouchDevice()` is `'ontouchstart' in window ||
           navigator.maxTouchPoints > 0`, and TieredMenu branches on it: on a touch profile the
           compat `mouseenter` opens a submenu and the click that follows toggles it shut, so the
           submenu scenario failed on that machine and passed on CI's touchless Linux runner.

           MEASURED, because the obvious flag is the wrong one. `--touch-events=disabled` leaves
           `maxTouchPoints` at 10 — it governs only whether touch EVENTS are delivered. The
           setting that moves the number web code actually reads is the one below:

             baseline                            ontouchstart=false  maxTouchPoints=10
             --touch-events=disabled             ontouchstart=false  maxTouchPoints=10
             --blink-settings=maxTouchPoints=0   ontouchstart=false  maxTouchPoints=0

           Touch behaviour is not going untested as a result: it moved to where it can be pinned
           per assertion instead of per machine — see forceTouchDevice() in src/spec-helpers.ts and
           the touch-branch specs in popover.spec.ts and password.spec.ts. */
        launchOptions: { args: ['--blink-settings=maxTouchPoints=0'] }
    },
    /* Playwright starts and stops both apps itself. It deliberately does not rely on an
       already-running server: a mandatory gate that depends on manual state can go green for
       the wrong reason. `reuseExistingServer` is enabled outside CI only, to keep the local
       development loop fast.

       Two apps, because the two gates need different things. The verification app is built to
       be driven — probes, fixed ids, scenarios that exercise the risky decorators. The showcase
       is the opposite and that is exactly its value: it holds the markup a reader copies, which
       is the markup the unit suite does not test. See demo-visibility.spec.ts.

       The showcase command spells out the generate step instead of leaning on the `prestart`
       hook. It has to run either way — the API, demo and guide payloads the pages fetch are
       generated and gitignored, and without them the site loads and shows nothing — and a step
       that decides whether this gate can see anything should be visible here, not implied. */
    webServer: [
        {
            command: 'npx ng serve verify --port 4210',
            cwd: '../apps/verify',
            url: 'http://localhost:4210',
            reuseExistingServer: !process.env.CI,
            timeout: 180_000
        },
        {
            command: 'npm run generate && npx ng serve showcase --port 4211',
            cwd: '../apps/showcase',
            url: 'http://localhost:4211',
            reuseExistingServer: !process.env.CI,
            timeout: 300_000
        }
    ],
    projects: [
        {
            /* The harness self-test runs on data: URLs and needs no app at all, so it sits with
               the verification app rather than earning a project of its own. */
            name: 'verify',
            testMatch: /(harness|risk-modules|upstream-repro)\.spec\.ts/,
            use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4210' }
        },
        {
            name: 'showcase',
            testMatch: /demo-visibility\.spec\.ts/,
            use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4211' }
        }
    ]
});
