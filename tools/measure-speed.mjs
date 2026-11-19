#!/usr/bin/env node
// What the library costs while an application RUNS: how long the browser's main thread is busy
// when a table of a thousand rows is shown, sorted, filtered and clicked, when a select opens
// over a thousand options, when a dialog or a date picker opens.
//
//   node tools/measure-speed.mjs                     every scene, 5 runs each
//   node tools/measure-speed.mjs --runs 9            more runs — every number is a median
//   node tools/measure-speed.mjs --only table,select
//   node tools/measure-speed.mjs --json out.json
//   node tools/measure-speed.mjs --compare old.json  the same table, with the change beside it
//   node tools/measure-speed.mjs --profile table:0   where the time of one step goes, by function
//   node tools/measure-speed.mjs --site <dir>        another build of the verification app
//
// It serves the PRODUCTION build of the verification app (`apps/verify/dist/verify/browser`),
// whose `/speed` page holds the scenes (apps/verify/src/speed.ts), and drives it in Chromium
// with the CPU slowed four times: the same mid-range-phone profile `measure-load` uses.
//
// For each step it reports the main-thread time the step caused, from the action until the
// page is quiet again, as Chromium itself accounts for it (CDP `Performance.getMetrics`):
//   busy     everything the main thread did (TaskDuration)
//   script   of that, running JavaScript — the library, Angular and the scene's own template
//   style    recalculating styles
//   layout   laying out
// `busy` is what a person waits through before the page answers the next input. It includes
// work the step schedules for later (a debounced filter, a focus set in a timeout), which is
// why the tool waits for quiet instead of for the next frame.
//
// Every step also states what must be true afterwards (a thousand rows present, the panel
// open). A step that did nothing would read as a very fast one, so a failed expectation makes
// the whole run exit 2 instead of printing a number.
//
// The numbers move with the machine and its load. Compare runs taken on the same machine in
// the same sitting, and read a few per cent as noise. Nothing here is judged: it measures.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { median } from './measure-load.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SITE = join(ROOT, 'apps/verify/dist/verify/browser');

export const CPU_RATE = 4;
export const VIEWPORT = { width: 1280, height: 800 };

/** The main thread counts as quiet once it did less than this in each of two polls in a row. */
const QUIET_MS = 1.5;
const POLL_MS = 120;
const QUIET_TIMEOUT_MS = 30_000;

const rowsAre = (count) => `document.querySelectorAll('.p-datatable-tbody > tr').length === ${count}`;
const firstCell = (text) => `document.querySelector('.p-datatable-tbody > tr > td')?.textContent.trim() === '${text}'`;

/**
 * The scenes, and for each the steps a person takes in it, in order, on one page. `scene` names
 * the measurement and, unless `page` says otherwise, the `?scene=` of the page it runs on.
 * `click`, `type` and `scroll` name the element by selector; `expect` is evaluated in the page
 * after the step has gone quiet and must be true.
 */
export const SCENES = [
    {
        scene: 'table',
        n: 1000,
        steps: [
            { name: 'show 1,000 rows', click: '#show', expect: rowsAre(1000) },
            { name: 'sort by a text column', click: '#sort-name', expect: firstCell('Name 00000') },
            { name: 'sort by a number column', click: '#sort-amount', expect: `document.querySelector('.p-datatable-tbody > tr > td:nth-child(6)')?.textContent.trim() === '0'` },
            { name: 'click a row to select it', click: '.p-datatable-tbody > tr:nth-child(5)', expect: `document.querySelectorAll('.p-datatable-row-selected').length === 1` },
            { name: 'type in an unrelated input', type: '#other', text: 'a', expect: `document.querySelector('#typed').textContent === 'a'` },
            { name: 'filter down to 125 rows', type: '#search', text: 'Hue', expect: rowsAre(125) },
            { name: 'clear the filter', type: '#search', text: '', expect: rowsAre(1000) },
            { name: 'remove the table', click: '#hide', expect: `!document.querySelector('agl-table')` }
        ]
    },
    {
        scene: 'table-checkbox',
        n: 1000,
        steps: [
            { name: 'show 1,000 rows with a checkbox each', click: '#show', expect: rowsAre(1000) },
            { name: 'tick one row', click: '.p-datatable-tbody > tr:nth-child(5) input', expect: `document.querySelectorAll('.p-datatable-tbody .p-checkbox-checked').length === 1` },
            { name: 'tick the header box (all rows)', click: '#all', expect: `document.querySelectorAll('.p-datatable-tbody .p-checkbox-checked').length === 1000` },
            { name: 'type in an unrelated input', type: '#other', text: 'a', expect: `document.querySelector('#typed').textContent === 'a'` }
        ]
    },
    {
        scene: 'table-paged',
        n: 10000,
        steps: [
            { name: 'show page 1 of 10,000 rows (100 a page)', click: '#show', expect: rowsAre(100) },
            { name: 'go to the next page', click: '.p-paginator-next', expect: `${rowsAre(100)} && document.querySelector('.p-paginator-page-selected')?.textContent.trim() === '2'` },
            { name: 'sort 10,000 rows', click: '#sort-name', expect: firstCell('Name 00000') }
        ]
    },
    {
        scene: 'table-virtual',
        n: 10000,
        steps: [
            { name: 'show 10,000 rows, virtual scrolling', click: '#show', expect: `document.querySelectorAll('.p-datatable-tbody > tr').length > 5 && document.querySelectorAll('.p-datatable-tbody > tr').length < 200` },
            { name: 'scroll a long way down', scroll: '.p-virtualscroller', top: 200000, expect: `document.querySelector('.p-datatable-tbody > tr > td')?.textContent.trim() !== 'Name 00000'` }
        ]
    },
    {
        scene: 'select',
        n: 1000,
        steps: [
            { name: 'create a select over 1,000 options', click: '#show', expect: `!!document.querySelector('#select')` },
            { name: 'open it', click: '#select', expect: `document.querySelectorAll('.p-select-option').length === 1000` },
            { name: 'type one letter in its filter', type: '.p-select-filter', text: '7', expect: `document.querySelectorAll('.p-select-option').length > 0 && document.querySelectorAll('.p-select-option').length < 1000` },
            { name: 'pick an option', click: '.p-select-option', expect: `!document.querySelector('.p-select-option') && !document.querySelector('#select .p-placeholder')` }
        ]
    },
    {
        scene: 'multiselect',
        n: 1000,
        steps: [
            { name: 'create a multiselect over 1,000 options', click: '#show', expect: `!!document.querySelector('#multiselect')` },
            { name: 'open it', click: '#multiselect', expect: `document.querySelectorAll('.p-multiselect-option').length === 1000` },
            { name: 'tick one option', click: '.p-multiselect-option', expect: `document.querySelectorAll('.p-multiselect-option-selected').length === 1` },
            { name: 'tick "all"', click: '.p-multiselect-header input[type=checkbox]', expect: `document.querySelectorAll('.p-multiselect-option-selected').length === 1000` }
        ]
    },
    {
        scene: 'dialog',
        n: 1,
        steps: [
            { name: 'open a dialog holding a twelve-field form', click: '#show', expect: `document.querySelectorAll('.p-dialog input').length === 12` },
            { name: 'close it', click: '.p-dialog-close-button', expect: `!document.querySelector('.p-dialog')` }
        ]
    },
    {
        scene: 'datepicker',
        n: 1,
        steps: [
            { name: 'create a date picker', click: '#show', expect: `!!document.querySelector('#datepicker')` },
            { name: 'open its calendar', click: '#datepicker .p-datepicker-dropdown', expect: `document.querySelectorAll('.p-datepicker-day').length >= 28` },
            { name: 'go to the next month', click: '.p-datepicker-next-button', expect: `document.querySelectorAll('.p-datepicker-day').length >= 28` },
            { name: 'pick a day', click: '.p-datepicker-day:not(.p-disabled)', expect: `document.querySelector('#datepicker input').value !== ''` }
        ]
    },
    {
        scene: 'buttons',
        n: 1000,
        steps: [
            { name: 'create 1,000 buttons', click: '#show', expect: `document.querySelectorAll('agl-button button').length === 1000` },
            { name: 'type in an unrelated input', type: '#other', text: 'a', expect: `document.querySelector('#typed').textContent === 'a'` },
            { name: 'remove them', click: '#hide', expect: `!document.querySelector('agl-button')` }
        ]
    },
    {
        scene: 'controls',
        n: 200,
        steps: [
            { name: 'create 200 inputs with a tooltip and 200 checkboxes', click: '#show', expect: `document.querySelectorAll('input.p-inputtext').length === 200 && document.querySelectorAll('agl-checkbox').length === 200` },
            { name: 'type in an unrelated input', type: '#other', text: 'a', expect: `document.querySelector('#typed').textContent === 'a'` },
            { name: 'remove them', click: '#hide', expect: `!document.querySelector('agl-checkbox')` }
        ]
    },
    {
        // Until 22.6.10 every input checked the whole view again from inside its own check, one
        // inside the other: about four hundred in one view overflowed the stack and the page
        // stayed half built. Six hundred is here so that cannot come back unnoticed.
        scene: 'controls-600',
        page: 'controls',
        n: 600,
        steps: [{ name: 'create 600 inputs and 600 checkboxes in one view', click: '#show', expect: `document.querySelectorAll('input.p-inputtext').length === 600 && document.querySelectorAll('agl-checkbox').length === 600` }]
    }
];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function fail(message) {
    console.error(`measure-speed: ${message}`);
    process.exit(2);
}

/** A static host for a single-page app: a path that is not a file gets the app's index.html. */
function serve(site) {
    const cache = new Map();
    const index = join(site, 'index.html');
    const server = createServer((req, res) => {
        const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        let path = join(site, url);
        if (!path.startsWith(site)) return res.writeHead(403).end();
        if (!cache.has(path)) {
            let raw;
            try {
                raw = readFileSync(path);
            } catch {
                if (extname(url)) return res.writeHead(404).end();
                path = index;
                raw = readFileSync(index);
            }
            cache.set(path, gzipSync(raw));
        }
        const body = cache.get(path);
        res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'content-encoding': 'gzip', 'cache-control': 'no-store', 'content-length': body.length });
        res.end(body);
    });
    return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

/** Seconds, as Chromium reports them, to milliseconds for the four counters this tool reads. */
export function counters(metrics) {
    const of = (name) => (metrics.find((m) => m.name === name)?.value ?? NaN) * 1000;
    return { busy: of('TaskDuration'), script: of('ScriptDuration'), style: of('RecalcStyleDuration'), layout: of('LayoutDuration') };
}

export function difference(after, before) {
    return { busy: after.busy - before.busy, script: after.script - before.script, style: after.style - before.style, layout: after.layout - before.layout };
}

/** The median of each counter over the runs, rounded to a tenth of a millisecond. */
export function summarise(samples) {
    const out = {};
    for (const key of ['busy', 'script', 'style', 'layout']) out[key] = Number(median(samples.map((s) => s[key])).toFixed(1));
    out.range = [Number(Math.min(...samples.map((s) => s.busy)).toFixed(1)), Number(Math.max(...samples.map((s) => s.busy)).toFixed(1))];
    return out;
}

/** "−12 %" for a step that got faster, "+12 %" for one that got slower, blank when there is no before. */
export function change(now, before) {
    if (before === undefined || !(before > 0)) return '';
    const pct = ((now - before) / before) * 100;
    return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(0)} %`;
}

async function read(cdp) {
    return counters((await cdp.send('Performance.getMetrics')).metrics);
}

async function quiet(page, cdp) {
    const started = Date.now();
    let last = await read(cdp);
    let calm = 0;
    while (calm < 2) {
        if (Date.now() - started > QUIET_TIMEOUT_MS) throw new Error('the page never went quiet');
        await page.waitForTimeout(POLL_MS);
        const now = await read(cdp);
        calm = now.busy - last.busy < QUIET_MS ? calm + 1 : 0;
        last = now;
    }
    return last;
}

/** Runs in the page: do what the step says, as the event a person's action would raise. */
function act(step) {
    const target = document.querySelector(step.click ?? step.type ?? step.scroll);
    if (!target) return `no element matches ${step.click ?? step.type ?? step.scroll}`;
    if (step.click) target.click();
    else if (step.type !== undefined) {
        target.value = step.text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        target.scrollTop = step.top;
    }
    return null;
}

async function open(browser, origin, entry, cpuRate) {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().split('\n')[0].slice(0, 200)));
    page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0].slice(0, 200)));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto(`${origin}/speed?scene=${entry.page ?? entry.scene}&n=${entry.n}`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForSelector('#show');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
    return { context, page, cdp, errors };
}

/** One page, the scene's steps in order. `profileStep` records a CPU profile around that step. */
async function runScene(browser, origin, entry, cpuRate, profileStep) {
    const { context, page, cdp, errors } = await open(browser, origin, entry, cpuRate);
    const results = [];
    let profile = null;
    try {
        for (const [i, step] of entry.steps.entries()) {
            const before = await quiet(page, cdp);
            if (i === profileStep) {
                await cdp.send('Profiler.enable');
                await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
                await cdp.send('Profiler.start');
            }
            const missing = await page.evaluate(act, step);
            if (missing) throw new Error(`${entry.scene} — "${step.name}": ${missing}`);
            const after = await quiet(page, cdp);
            if (i === profileStep) profile = (await cdp.send('Profiler.stop')).profile;
            if (!(await page.evaluate(step.expect))) throw new Error(`${entry.scene} — "${step.name}" did not do what it measures: ${step.expect}`);
            results.push(difference(after, before));
        }
        if (errors.length) throw new Error(`${entry.scene} logged: ${errors.join(' | ')}`);
    } finally {
        await context.close();
    }
    return { results, profile };
}

/** Self time per function, heaviest first, from a CDP CPU profile. */
export function selfTimes(profile) {
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const total = new Map();
    for (const [i, id] of profile.samples.entries()) {
        const node = byId.get(id);
        const frame = node.callFrame;
        const file = frame.url.split('/').pop() || '(native)';
        const key = `${frame.functionName || '(anonymous)'}  ${file}:${frame.lineNumber + 1}`;
        total.set(key, (total.get(key) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000);
    }
    return [...total.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
    const args = process.argv.slice(2);
    const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
    const runs = Number(flag('--runs') ?? 5);
    const only = flag('--only')?.split(',');
    const jsonOut = flag('--json');
    const compareTo = flag('--compare');
    const profileOf = flag('--profile');
    const cpuRate = Number(flag('--cpu') ?? CPU_RATE);
    const site = flag('--site') ? resolve(flag('--site')) : DEFAULT_SITE;

    if (!existsSync(join(site, 'index.html'))) fail(`no build at ${relative(ROOT, site)} — run: corepack pnpm --filter @angulux/verify run build`);
    const before = compareTo ? JSON.parse(readFileSync(resolve(compareTo), 'utf8')) : null;

    let chromium;
    try {
        ({ chromium } = await import('@playwright/test'));
    } catch (error) {
        fail(`@playwright/test did not load: ${error.message}`);
    }

    const server = await serve(site);
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    try {
        if (profileOf) {
            const [name, index] = profileOf.split(':');
            const entry = SCENES.find((s) => s.scene === name);
            const stepIndex = Number(index ?? 0);
            if (!entry || !entry.steps[stepIndex]) fail(`--profile wants scene:step, for example table:0; scenes are ${SCENES.map((s) => s.scene).join(', ')}`);
            const { results, profile } = await runScene(browser, origin, entry, cpuRate, stepIndex);
            const rows = selfTimes(profile).filter(([key]) => !key.startsWith('(idle)') && !key.startsWith('(program)'));
            console.log(`${entry.scene} — "${entry.steps[stepIndex].name}": busy ${results[stepIndex].busy.toFixed(0)} ms, script ${results[stepIndex].script.toFixed(0)} ms (CPU ÷${cpuRate})`);
            console.log('self time per function, ms\n');
            for (const [key, ms] of rows.slice(0, Number(flag('--top') ?? 30))) console.log(`${ms.toFixed(1).padStart(8)}  ${key}`);
            if (jsonOut) writeFileSync(resolve(jsonOut), JSON.stringify(profile));
            return;
        }

        const scenes = only ? SCENES.filter((s) => only.includes(s.scene)) : SCENES;
        if (scenes.length === 0) fail(`no scene named ${only}; scenes are ${SCENES.map((s) => s.scene).join(', ')}`);
        const report = { cpuRate, viewport: VIEWPORT, runs, steps: {} };
        // One page at a time: two slowed pages sharing a CPU would time each other.
        for (const entry of scenes) {
            const samples = [];
            for (let i = 0; i < runs; i += 1) {
                samples.push((await runScene(browser, origin, entry, cpuRate, -1)).results);
                process.stderr.write('.');
            }
            for (const [i, step] of entry.steps.entries()) report.steps[`${entry.scene} — ${step.name}`] = summarise(samples.map((s) => s[i]));
        }
        process.stderr.write('\n');

        if (jsonOut) writeFileSync(resolve(jsonOut), `${JSON.stringify(report, null, 4)}\n`);

        const ms = (n) => n.toFixed(0).padStart(7);
        console.log(`verification app, production build — ${runs} runs each, medians, main-thread ms with the CPU slowed ${cpuRate}×, ${VIEWPORT.width}×${VIEWPORT.height}\n`);
        console.log(`${'step'.padEnd(66)} ${'busy'.padStart(7)} ${'script'.padStart(7)} ${'style'.padStart(7)} ${'layout'.padStart(7)}   ${'busy, low–high'.padEnd(14)}${before ? '  was     change' : ''}`);
        let scene = '';
        for (const [key, s] of Object.entries(report.steps)) {
            const [of, name] = key.split(' — ');
            if (of !== scene) console.log(`\n${(scene = of)}`);
            const was = before?.steps[key]?.busy;
            console.log(`  ${name.padEnd(64)} ${ms(s.busy)} ${ms(s.script)} ${ms(s.style)} ${ms(s.layout)}   ${`${s.range[0].toFixed(0)}–${s.range[1].toFixed(0)}`.padEnd(14)}${was === undefined ? '' : `${ms(was)}  ${change(s.busy, was).padStart(7)}`}`);
        }
    } catch (error) {
        console.error(`\nmeasure-speed: ${error.message}`);
        process.exitCode = 2;
    } finally {
        await browser.close();
        server.close();
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
