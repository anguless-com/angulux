import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseChangelog } from '../upstream/parse-changelog.mjs';
import { createTriage, VERDICTS } from '../upstream/triage.mjs';
import { ALLOWED, fetchChangelog } from '../upstream/source.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = (p) => join(repoRoot, p);
const FIXTURE = at('tools/upstream/fixtures/changelog-sample.html');
const fixture = readFileSync(FIXTURE, 'utf8');

/**
 * The upstream listening post.
 *
 * Two things are under test and they are not the same thing. One is a parser, which fails in
 * the ordinary ways parsers fail. The other is a LEGAL BOUNDARY — the rule that angulux reads
 * what PrimeTek publishes about `primeng@22` and never reads `primeng@22`. A boundary that is
 * only stated in a comment is not enforced, so it is tested here like any other behaviour.
 */

// ---------------------------------------------------------------------------------------
// The wall
// ---------------------------------------------------------------------------------------

test('the fetcher refuses any URL but the changelog, and refuses it BEFORE the request', async () => {
    // A fetch that throws on contact. If the refusal ever moves to after the request — a
    // redirect followed, a "just check the status first" — this test is what notices.
    const explode = () => {
        throw new Error('the network was reached');
    };

    for (const forbidden of [
        'https://primeng.dev/',
        'https://github.com/primefaces/primeng/commit/abc123.patch',
        'https://registry.npmjs.org/primeng/22.1.0',
        'https://primeng.dev/changelog?v=22'
    ]) {
        await assert.rejects(
            () => fetchChangelog(forbidden, explode),
            (error) => {
                assert.match(error.message, /refusing to fetch/);
                assert.doesNotMatch(error.message, /the network was reached/, 'the refusal must happen before fetch is called');
                return true;
            },
            `${forbidden} must be refused`
        );
    }
});

test('the one allowed address is the changelog page and nothing broader', () => {
    assert.equal(ALLOWED, 'https://primeng.dev/changelog');
});

test('no source file in tools/upstream reaches for anything but the changelog', () => {
    // The wall is one constant in one module. This fails if a second URL appears anywhere in
    // the tool — which is how "just fetch the release notes too" would arrive.
    const files = ['parse-changelog.mjs', 'triage.mjs', 'source.mjs', 'watch-changelog.mjs'];
    for (const file of files) {
        const body = readFileSync(at(`tools/upstream/${file}`), 'utf8');
        for (const url of body.match(/https?:\/\/[^\s'"`)]+/g) ?? []) {
            const allowed = url === ALLOWED || url.startsWith('https://github.com/anguless-com/angulux');
            assert.ok(allowed, `${file} names ${url}; the only reachable address is ${ALLOWED}`);
        }
    }
});

// ---------------------------------------------------------------------------------------
// The parser
// ---------------------------------------------------------------------------------------

test('a release is read as version, date, highlights and counted sections', () => {
    const [latest, previous] = parseChangelog(fixture);

    assert.equal(latest.version, '9.9.0');
    assert.equal(latest.date, 'Jan 2, 2099');
    assert.deepEqual(latest.highlights, ['A headline nobody has to map to a module', 'New Component: Widgetron']);
    assert.equal(latest.sections.length, 1);
    assert.equal(latest.sections[0].label, 'Defect Fixes');
    assert.equal(latest.sections[0].entries.length, 6);

    assert.equal(previous.version, '9.8.0');
    assert.equal(previous.date, 'Dec 1, 2098');
});

test('entities are decoded and icon markup never leaks into an entry', () => {
    const [latest] = parseChangelog(fixture);
    const first = latest.sections[0].entries[0];
    assert.equal(first.scope, 'Table');
    assert.equal(first.text, 'Sorting & paging disagree after the rows change');
    for (const entry of latest.sections[0].entries) {
        assert.doesNotMatch(entry.text, /svg|path|<|>/, `"${entry.text}" carries markup`);
    }
});

test('a release with no sections does not have its own highlights counted twice', () => {
    // The trap: "the first list in the block" is the highlight list only while every release
    // has highlights. A defect list read as a highlight list would double every entry in it.
    const [, previous] = parseChangelog(fixture);
    assert.deepEqual(previous.highlights, ['A release with highlights and nothing else']);
    assert.deepEqual(previous.sections, []);
});

test('markup drift fails loudly instead of reporting no news', () => {
    assert.throws(() => parseChangelog('<html><body><p>a redesign</p></body></html>'), /no version headings found/);
});

test("a section that declares more entries than it yields is a parse failure, not a short list", () => {
    // The page states its own counts. That arithmetic is the only drift detector available
    // for a list whose length nobody knows in advance.
    const short = fixture.replace('Defect Fixes (6)', 'Defect Fixes (9)');
    assert.throws(() => parseChangelog(short), /declares 9 entries but 6 were parsed/);
});

// ---------------------------------------------------------------------------------------
// The triage rule
// ---------------------------------------------------------------------------------------

const triage = createTriage({ closure: ['table', 'api', 'select'], attic: ['tree', 'inputmask'] });

test('only a module angulux actually ships can produce work', () => {
    assert.equal(triage({ scope: 'Table', text: '' }).verdict, VERDICTS.follow);
    assert.equal(triage({ scope: 'Table', text: '' }).module, 'table');
});

test('a parked module is recorded, not scheduled', () => {
    const verdict = triage({ scope: 'Tree', text: '' });
    assert.equal(verdict.verdict, VERDICTS.attic);
    assert.match(verdict.reason, /attic/);
});

test('a name this tree does not have is out of reach, and does not guess at a substitute', () => {
    // Upstream-only component or a rename we did not follow — the changelog cannot tell them
    // apart, so neither does this. Guessing produces confident work on the wrong file.
    const verdict = triage({ scope: 'Widgetron', text: '' });
    assert.equal(verdict.verdict, VERDICTS.outOfReach);
    assert.equal(verdict.module, null);
});

test('framework-scoped and site-scoped entries are separated from module work', () => {
    assert.equal(triage({ scope: 'Core', text: '' }).verdict, VERDICTS.crossCutting);
    assert.equal(triage({ scope: 'Docs', text: '' }).verdict, VERDICTS.upstreamOnly);
    assert.equal(triage({ scope: null, text: 'a highlight' }).verdict, VERDICTS.crossCutting);
});

test('the one alias that exists is the one that was verified in our own source', () => {
    // packages/angulux/src/api/filterservice.ts — upstream calls it FilterService, we ship it
    // from angulux/api. Every other alias would be a guess.
    const verdict = triage({ scope: 'FilterService', text: '' });
    assert.equal(verdict.module, 'api');
    assert.equal(verdict.verdict, VERDICTS.follow);
});

// ---------------------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------------------

const run = (args) => execFileSync(process.execPath, [at('tools/upstream/watch-changelog.mjs'), ...args], { cwd: repoRoot, encoding: 'utf8' });

test('the command reads a saved page, triages it against the real module tree, and touches no network', () => {
    const out = JSON.parse(run(['--from', FIXTURE, '--json']));

    assert.equal(out.source, ALLOWED);
    assert.equal(out.entries.length, 9, '3 highlights + 6 defect entries');

    const byVerdict = {};
    for (const entry of out.entries) byVerdict[entry.verdict] = (byVerdict[entry.verdict] ?? 0) + 1;

    // Read against the live closure and attic, so this also fails if `table` leaves the
    // shipped set or `tree` leaves the attic without anyone revisiting the watch.
    assert.equal(byVerdict[VERDICTS.follow], 2, 'Table and FilterService');
    assert.equal(byVerdict[VERDICTS.attic], 1, 'Tree');
    assert.equal(byVerdict[VERDICTS.outOfReach], 1, 'Widgetron');
    assert.equal(byVerdict[VERDICTS.upstreamOnly], 1, 'Docs');
});

test('an unrecorded entry fails --check, because recording IS the triage', () => {
    // The fixture's versions are invented, so they can never appear in seen.json and this
    // stays true no matter what the real register holds.
    assert.throws(
        () => run(['--from', FIXTURE, '--check']),
        (error) => error.status === 1,
        '--check must exit 1 while anything is unrecorded'
    );
});

test('the committed register declares the page it came from and nothing else', () => {
    const seen = JSON.parse(readFileSync(at('tools/upstream/seen.json'), 'utf8'));
    assert.equal(seen.source, ALLOWED);
    for (const [key, value] of Object.entries(seen.entries)) {
        assert.ok(Object.values(VERDICTS).includes(value.verdict), `${key} carries an unknown verdict ${value.verdict}`);
    }
});

test('the register keeps decisions, never upstream prose', () => {
    // CONTRIBUTING.md: primeng.dev content sits outside the MIT grant, so its prose cannot be
    // copied into this repository — and a register keyed by their sentences is that copy.
    // Every key must be `<version> · <scope> · <digest>`, which carries no sentence at all.
    const shape = /^\d+(?:\.\d+)* · [A-Za-z0-9]+ · [0-9a-f]{12}$/;
    const seen = JSON.parse(readFileSync(at('tools/upstream/seen.json'), 'utf8'));
    for (const key of Object.keys(seen.entries)) {
        assert.match(key, shape, `"${key}" is not a digest key — the entry text must not be stored`);
    }
});

test('--record writes digest keys, and a hand-written note survives the next record', (t) => {
    // Two failures this catches: the key regressing to the raw sentence, and `--record`
    // flattening the notes that are the only reason to read the file.
    const scratch = join(repoRoot, 'tools/upstream/seen.json');
    const before = readFileSync(scratch, 'utf8');
    t.after(() => writeFileSync(scratch, before));

    run(['--from', FIXTURE, '--record']);
    const first = JSON.parse(readFileSync(scratch, 'utf8'));
    const keys = Object.keys(first.entries);
    assert.equal(keys.length, 9);
    for (const key of keys) assert.match(key, /^9\.\d\.0 · [A-Za-z0-9]+ · [0-9a-f]{12}$/);

    const noted = keys.find((k) => first.entries[k].module === 'table');
    first.entries[noted].note = 'reproduced against our table, ours paginates correctly';
    writeFileSync(scratch, `${JSON.stringify(first, null, 4)}\n`);

    run(['--from', FIXTURE, '--record']);
    const second = JSON.parse(readFileSync(scratch, 'utf8'));
    assert.equal(second.entries[noted].note, 'reproduced against our table, ours paginates correctly');
});
