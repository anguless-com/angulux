#!/usr/bin/env node
// What it costs a reader to open each page of the showcase: the bytes the page pulls before
// the network goes quiet, and how long a mid-range phone on a slow connection waits to see it.
//
//   node tools/measure-load.mjs                   every prerendered page, 3 runs each
//   node tools/measure-load.mjs --runs 5          more runs — the timings are medians
//   node tools/measure-load.mjs --only table,button
//   node tools/measure-load.mjs --json out.json
//
// It serves the PRODUCTION build (`apps/showcase/dist/showcase/browser`) itself, gzipped, the
// way a static host does. The dev server is the wrong thing to time: unminified, unbundled,
// and it never ships.
//
// Two kinds of number come out, and they are not equally trustworthy.
//   • Bytes and request counts are exact and repeat to the byte for the same build.
//   • Timings are measured under emulated throttling (the constants below) on whatever machine
//     runs this. They move with the load on that machine; compare runs taken on the same
//     machine in the same sitting, and read a difference of a few per cent as noise.
//
//   node tools/measure-load.mjs --check --runs 1 --only /,button,table   (CI)
//
// Without --check it measures and does not judge. With it, two things fail the run (exit 1),
// and both are properties of what the page does rather than of how fast the machine is:
//   • a font file other than woff2 was requested;
//   • the layout shifted by CLS_LIMIT or more while the page loaded.
// Timings are never judged. Exit 2 means it could not measure.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'apps/showcase/dist/showcase/browser');

/** Lighthouse's "slow 4G" and a 4× CPU slowdown — the profile a page is usually graded on. */
export const THROTTLE = { latencyMs: 150, downloadKbps: 1638.4, uploadKbps: 750, cpuRate: 4 };
export const VIEWPORT = { width: 412, height: 823 };

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp' };
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt']);

/**
 * Cumulative layout shift a page may reach under --check. The pages this was written for sat
 * at about 0.35 before they were fixed and at about 0.006 after; 0.1 is the line web vitals
 * calls "good", and it is far from both.
 */
export const CLS_LIMIT = 0.1;

/** What --check objects to, per page. `pages` is the report's `{ route: { cls, fonts } }`. */
export function judgeLoad(pages) {
    const problems = [];
    for (const [route, p] of Object.entries(pages)) {
        const legacy = (p.fonts ?? []).filter((f) => !f.endsWith('.woff2'));
        if (legacy.length) problems.push(`${route}: requested ${legacy.join(', ')} — only woff2 should ever be fetched`);
        if (p.cls >= CLS_LIMIT) problems.push(`${route}: layout shift ${p.cls}, limit ${CLS_LIMIT}`);
    }
    return problems;
}

export function kind(path) {
    const ext = extname(path);
    if (ext === '.html' || ext === '') return 'html';
    if (ext === '.js' || ext === '.mjs') return 'js';
    if (ext === '.css') return 'css';
    if (['.woff2', '.woff', '.ttf', '.eot'].includes(ext)) return 'font';
    if (ext === '.json') return 'data';
    return 'other';
}

export function median(values) {
    const v = [...values].sort((a, b) => a - b);
    if (v.length === 0) return NaN;
    const mid = v.length >> 1;
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Every directory holding an `index.html` is a prerendered route. */
export function routes(site) {
    const out = [];
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) walk(join(dir, entry.name));
            else if (entry.name === 'index.html') out.push(`/${relative(site, dir).replaceAll('\\', '/')}`.replace(/\/$/, '') || '/');
        }
    };
    walk(site);
    return out.sort();
}

function fail(message) {
    console.error(`measure-load: ${message}`);
    process.exit(2);
}

/** A static host: gzip for text, the route's own index.html, nothing clever. */
function serve(site) {
    const cache = new Map();
    const server = createServer((req, res) => {
        const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        const file = join(site, url);
        if (!file.startsWith(site)) return res.writeHead(403).end();
        // Read first and ask afterwards: a file checked and then opened is two moments, and
        // the answer to the first is not a fact about the second.
        let path = file;
        let raw;
        try {
            raw = readFileSync(path);
        } catch (error) {
            if (error.code !== 'EISDIR') return res.writeHead(404).end();
            path = join(file, 'index.html');
            try {
                raw = readFileSync(path);
            } catch {
                return res.writeHead(404).end();
            }
        }
        const ext = extname(path);
        const headers = { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-store' };
        let body = raw;
        if (COMPRESSIBLE.has(ext)) {
            if (!cache.has(path)) cache.set(path, gzipSync(raw, { level: 9 }));
            body = cache.get(path);
            headers['content-encoding'] = 'gzip';
        }
        res.writeHead(200, { ...headers, 'content-length': body.length });
        res.end(body);
    });
    return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

/** Runs in the page before any of its scripts: collect the paint and long-task entries. */
function observe() {
    const m = (window.__load = { fcp: null, lcp: null, cls: 0, tasks: [] });
    new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime;
    }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver((l) => {
        for (const e of l.getEntries()) m.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) m.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => {
        for (const e of l.getEntries()) m.tasks.push([e.startTime, e.duration]);
    }).observe({ type: 'longtask', buffered: true });
}

async function visit(browser, origin, route) {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: THROTTLE.latencyMs, downloadThroughput: (THROTTLE.downloadKbps * 1024) / 8, uploadThroughput: (THROTTLE.uploadKbps * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE.cpuRate });
    await page.addInitScript(observe);

    const requests = new Map();
    const failed = [];
    cdp.on('Network.responseReceived', (e) => requests.set(e.requestId, { url: e.response.url, status: e.response.status, bytes: 0 }));
    cdp.on('Network.loadingFinished', (e) => {
        const r = requests.get(e.requestId);
        if (r) r.bytes = e.encodedDataLength;
    });
    cdp.on('Network.loadingFailed', (e) => failed.push(requests.get(e.requestId)?.url ?? e.requestId));

    // A page that logs an error — a hydration mismatch, a failed chunk — did not load the way
    // a reader's would, and its numbers describe something else.
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().split('\n')[0].slice(0, 200)));
    page.on('pageerror', (e) => errors.push(String(e.message).split('\n')[0].slice(0, 200)));

    await page.goto(origin + route, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => window.__load);
    await context.close();

    const bytes = { html: 0, js: 0, css: 0, font: 0, data: 0, other: 0 };
    let count = 0;
    const bad = [];
    const fonts = [];
    for (const r of requests.values()) {
        if (!r.url.startsWith(origin)) continue;
        if (r.status >= 400) bad.push(`${r.status} ${r.url.slice(origin.length)}`);
        const path = new URL(r.url).pathname;
        if (kind(path) === 'font') fonts.push(path.split('/').pop());
        bytes[kind(path)] += r.bytes;
        count += 1;
    }
    // Total blocking time: the part of every long task past 50 ms, counted from first paint.
    const tbt = m.tasks.filter(([start]) => m.fcp === null || start >= m.fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
    return { bytes, total: Object.values(bytes).reduce((a, b) => a + b, 0), requests: count, fcp: m.fcp, lcp: m.lcp, cls: m.cls, tbt, bad, failed, errors, fonts: fonts.sort() };
}

async function main() {
    const args = process.argv.slice(2);
    const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
    const runs = Number(flag('--runs') ?? 3);
    const only = flag('--only')?.split(',').map((s) => (s === '/' ? '/' : `/${s.replace(/^\//, '')}`));
    const jsonOut = flag('--json');

    if (!existsSync(join(SITE, 'index.html'))) fail(`no production build at ${relative(ROOT, SITE)} — run: corepack pnpm --filter @angulux/showcase run build`);
    let pages = routes(SITE);
    if (only) pages = pages.filter((p) => only.includes(p));
    if (pages.length === 0) fail('no prerendered page to measure');

    let chromium;
    try {
        ({ chromium } = await import('@playwright/test'));
    } catch (error) {
        fail(`@playwright/test did not load: ${error.message}`);
    }

    const server = await serve(SITE);
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    const report = { throttle: THROTTLE, viewport: VIEWPORT, runs, pages: {} };
    const problems = [];
    try {
        // One page at a time: two throttled pages sharing a CPU would time each other.
        for (const route of pages) {
            const samples = [];
            for (let i = 0; i < runs; i += 1) samples.push(await visit(browser, origin, route));
            const first = samples[0];
            if (first.bad.length || first.failed.length || first.errors.length) problems.push(`${route}: ${[...first.bad, ...first.failed.map((f) => `failed ${f}`), ...first.errors.map((e) => `console: ${e}`)].join(', ')}`);
            if (samples.some((s) => s.fcp === null || s.lcp === null)) problems.push(`${route}: no paint was recorded`);
            report.pages[route] = {
                requests: first.requests,
                fonts: first.fonts,
                bytes: first.bytes,
                total: first.total,
                fcp: Math.round(median(samples.map((s) => s.fcp))),
                lcp: Math.round(median(samples.map((s) => s.lcp))),
                tbt: Math.round(median(samples.map((s) => s.tbt))),
                cls: Number(median(samples.map((s) => s.cls)).toFixed(3)),
                lcpRange: [Math.round(Math.min(...samples.map((s) => s.lcp))), Math.round(Math.max(...samples.map((s) => s.lcp)))]
            };
            process.stderr.write('.');
        }
    } finally {
        process.stderr.write('\n');
        await browser.close();
        server.close();
    }

    if (jsonOut) writeFileSync(resolve(jsonOut), `${JSON.stringify(report, null, 4)}\n`);

    const k = (n) => (n / 1024).toFixed(1).padStart(7);
    const ms = (n) => String(n).padStart(6);
    const rows = Object.entries(report.pages).sort((a, b) => b[1].total - a[1].total);
    console.log(`showcase, production build — ${rows.length} pages, ${runs} runs each (timings are medians)`);
    console.log(`transfer in kB (gzip, 1024); timings in ms at ${THROTTLE.downloadKbps} kbps, ${THROTTLE.latencyMs} ms latency, CPU ÷${THROTTLE.cpuRate}, ${VIEWPORT.width}×${VIEWPORT.height}\n`);
    console.log(`${'page'.padEnd(18)} ${'req'.padStart(4)} ${'total'.padStart(7)} ${'js'.padStart(7)} ${'css'.padStart(7)} ${'html'.padStart(7)} ${'data'.padStart(7)} ${'font'.padStart(7)} | ${'FCP'.padStart(6)} ${'LCP'.padStart(6)} ${'TBT'.padStart(6)} ${'CLS'.padStart(6)}`);
    for (const [route, p] of rows) {
        console.log(`${route.padEnd(18)} ${String(p.requests).padStart(4)} ${k(p.total)} ${k(p.bytes.js)} ${k(p.bytes.css)} ${k(p.bytes.html)} ${k(p.bytes.data)} ${k(p.bytes.font)} | ${ms(p.fcp)} ${ms(p.lcp)} ${ms(p.tbt)} ${String(p.cls).padStart(6)}`);
    }
    const all = rows.map(([, p]) => p);
    console.log(`\nmedian page: ${k(median(all.map((p) => p.total)))} kB, FCP ${median(all.map((p) => p.fcp))} ms, LCP ${median(all.map((p) => p.lcp))} ms, TBT ${median(all.map((p) => p.tbt))} ms`);

    if (problems.length === 0 && args.includes('--check')) {
        const verdict = judgeLoad(report.pages);
        if (verdict.length) {
            console.error(`\nmeasure-load: ${verdict.length} problem(s) a reader pays for on every visit:`);
            for (const v of verdict) console.error(`  ${v}`);
            process.exit(1);
        }
        console.log(`\nmeasure-load: ${rows.length} page(s) checked — no font but woff2, layout shift under ${CLS_LIMIT}`);
    }

    if (problems.length) {
        console.error(`\nmeasure-load: ${problems.length} page(s) did not load cleanly, so their numbers are not a measurement:`);
        for (const p of problems) console.error(`  ${p}`);
        process.exit(2);
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
