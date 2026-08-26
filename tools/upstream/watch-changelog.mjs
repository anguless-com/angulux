#!/usr/bin/env node
/**
 * watch-changelog — the upstream listening post.
 *
 * THE PROBLEM IT SOLVES. angulux forked PrimeNG at `21.1.9`, the last MIT release. PrimeTek
 * kept shipping: `22.0.0` on 2026-07-15, `22.1.0` on 2026-08-18, all of it commercial. Those
 * releases still carry information we are entitled to — a defect report is a fact about
 * software behaviour, and facts are not licensed. Until now that information reached us only
 * when somebody remembered to open the page.
 *
 * THE LINE THIS TOOL DOES NOT CROSS. Constitution P1: never reference PrimeTek material at
 * the code level from `primeng@22` onward. So this reads ONE page, and the page it reads is
 * a list of sentences — no diff, no commit, no tarball, no `npm install`. That reach is not
 * a promise in a comment: it is `source.mjs`, which throws on any other URL and is tested.
 *
 * What comes out is a WORK SIGNAL, not a patch. "Table: incorrect paginator after data
 * change" tells us where to point our own test. Whether angulux has that defect is a
 * question only our own tree can answer — five years of divergence start at 21.1.9 — and if
 * it does, the fix is written here, from our source, in our style. That is the whole point:
 * follow the finding, never the code.
 *
 * THE LOOP.
 *   1. run it            — every entry not yet in `seen.json` is reported, grouped by what
 *                          it can possibly mean here (see triage.mjs)
 *   2. triage the report — the `follow` group is the only one that can become work
 *   3. `--record`        — writes the entries into `seen.json`, which is committed, so the
 *                          next run and the weekly CI job are quiet again
 *
 * Recording is the act of triage, so `--check` fails on ANY unrecorded entry, including the
 * ones that are obviously not ours. An entry silently filtered out by a rule nobody reviews
 * is the same false green this repo keeps paying for; one `--record` closes it in a commit
 * that shows what was decided.
 *
 * Usage:
 *   node tools/upstream/watch-changelog.mjs                  # fetch and report
 *   node tools/upstream/watch-changelog.mjs --check          # exit 1 if anything is unrecorded
 *   node tools/upstream/watch-changelog.mjs --record         # accept the current page into seen.json
 *   node tools/upstream/watch-changelog.mjs --from page.html # offline, from a saved copy
 *   node tools/upstream/watch-changelog.mjs --json           # machine-readable report
 *
 * Exit codes: 0 = nothing unrecorded (or not in --check mode) · 1 = unrecorded entries · 2 = failed to read the page.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseChangelog } from './parse-changelog.mjs';
import { ALLOWED, fetchChangelog } from './source.mjs';
import { createTriage, VERDICTS } from './triage.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const SEEN = resolve(here, 'seen.json');

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : argv[i + 1];
};

const RECORD = has('--record');
const CHECK = has('--check');
const JSON_OUT = has('--json');
const FROM = valueOf('--from');

/** The 64 shipped modules and the 53 parked ones, read from the tree rather than restated. */
function readTree() {
    const closure = JSON.parse(readFileSync(resolve(root, 'tools/scope/closure.json'), 'utf8')).closure;
    const attic = readdirSync(resolve(root, 'packages/angulux/attic'), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    return { closure, attic };
}

/**
 * Flatten releases into one list of entries. Highlights become a section of their own: they
 * are the only content `22.0.0` has, and they are where deprecations and new components are
 * announced, so dropping them would blind the watch to the largest changes upstream makes.
 */
function flatten(releases, triage) {
    const out = [];
    for (const release of releases) {
        const common = { version: release.version, date: release.date };
        for (const text of release.highlights) {
            out.push({ ...common, section: 'Highlights', scope: null, text, ...triage({ scope: null, text }) });
        }
        for (const section of release.sections) {
            for (const entry of section.entries) {
                out.push({ ...common, section: section.label, ...entry, ...triage(entry) });
            }
        }
    }
    return out;
}

/**
 * The identity of an entry, WITHOUT the sentence that identifies it.
 *
 * The obvious key is the changelog line itself, and it was — until CONTRIBUTING.md's own rule
 * was read back: primeng.dev content is *not* covered by the MIT grant, so "its prose and
 * examples cannot be copied even though the library code can". A register holding 41 of their
 * sentences verbatim is that copy, committed, in the one repository whose entire claim is
 * that it carries none of their material. Individually those lines are almost certainly too
 * short and too factual to be anyone's property — but "almost certainly" is the argument this
 * project does not want to be having, and a digest removes the question at no cost.
 *
 * So the sentence is hashed, never stored. Twelve hex characters is far more than enough to
 * separate a few dozen entries per release, and the version and scope stay in the clear so
 * that the file still reads as a record of DECISIONS rather than a wall of hashes.
 *
 * The live report still quotes the page — read fresh on every run, held in memory, never
 * written down. Reading is allowed; keeping the copy is what this avoids.
 */
const keyOf = (e) => `${e.version} · ${e.scope ?? e.section} · ${createHash('sha256').update(e.text).digest('hex').slice(0, 12)}`;

function readSeen() {
    try {
        return JSON.parse(readFileSync(SEEN, 'utf8'));
    } catch {
        return { entries: {} };
    }
}

const ORDER = [VERDICTS.follow, VERDICTS.crossCutting, VERDICTS.attic, VERDICTS.outOfReach, VERDICTS.upstreamOnly];

const LEGEND = {
    [VERDICTS.follow]: 'reproduce against angulux, then fix it our way if it reproduces',
    [VERDICTS.crossCutting]: 'framework-level — read the sentence and decide',
    [VERDICTS.attic]: 'parked module — matters only if it is promoted',
    [VERDICTS.outOfReach]: 'nothing of that name here — upstream-only, or a rename we did not follow',
    [VERDICTS.upstreamOnly]: 'their site, not our library'
};

function report(entries, unseen) {
    const lines = [];
    const unseenKeys = new Set(unseen.map(keyOf));

    lines.push(`upstream-watch · ${ALLOWED}`);
    lines.push('reads the published sentences only — no diff, no commit, no package (Constitution P1)');
    lines.push('');

    const versions = [...new Set(entries.map((e) => e.version))];
    for (const version of versions) {
        const mine = entries.filter((e) => e.version === version);
        const fresh = mine.filter((e) => unseenKeys.has(keyOf(e)));
        lines.push(`${version} (${mine[0].date ?? 'no date'}) — ${mine.length} entries, ${fresh.length} unrecorded`);

        for (const verdict of ORDER) {
            const group = fresh.filter((e) => e.verdict === verdict);
            if (group.length === 0) continue;
            lines.push(`  ${verdict} (${group.length}) — ${LEGEND[verdict]}`);
            for (const e of group) {
                const label = (e.module ?? e.scope ?? e.section).padEnd(16);
                lines.push(`    ${label} ${e.text}`);
            }
        }
        lines.push('');
    }

    const follow = unseen.filter((e) => e.verdict === VERDICTS.follow);
    lines.push(`${entries.length} entries across ${versions.length} releases · ${unseen.length} unrecorded · ${follow.length} in shipped modules`);
    if (unseen.length > 0) {
        lines.push('');
        lines.push('None of this is a patch to copy. Each `follow` line is a place to point our own test;');
        lines.push('if the defect does not reproduce here, the entry was about their tree, not ours.');
        lines.push('');
        lines.push('Once triaged:  node tools/upstream/watch-changelog.mjs --record');
    }
    return lines.join('\n');
}

/** Re-recording must not destroy hand-written triage notes; only the machine fields refresh. */
function record(entries) {
    const previous = readSeen();
    const next = {
        _comment:
            'Upstream changelog entries already triaged, keyed by release, scope and a digest of the entry. The sentences themselves are deliberately not stored: primeng.dev content is outside the MIT grant (CONTRIBUTING.md), so this file records OUR decisions, not their prose. Regenerate with: npm run watch:upstream -- --record',
        source: ALLOWED,
        entries: {}
    };
    for (const e of entries) {
        const key = keyOf(e);
        next.entries[key] = {
            verdict: e.verdict,
            module: e.module,
            ...(previous.entries?.[key]?.note ? { note: previous.entries[key].note } : {})
        };
    }
    writeFileSync(SEEN, `${JSON.stringify(next, null, 4)}\n`);
    return Object.keys(next.entries).length;
}

async function main() {
    let html;
    try {
        html = FROM ? readFileSync(resolve(process.cwd(), FROM), 'utf8') : await fetchChangelog();
    } catch (error) {
        console.error(`✗ ${error.message}`);
        process.exit(2);
    }

    const entries = flatten(parseChangelog(html), createTriage(readTree()));
    const seen = readSeen().entries ?? {};
    const unseen = entries.filter((e) => !(keyOf(e) in seen));

    if (RECORD) {
        const total = record(entries);
        console.log(`✓ upstream-watch: recorded ${total} entries (${unseen.length} newly triaged) in tools/upstream/seen.json`);
        return;
    }

    if (JSON_OUT) {
        console.log(JSON.stringify({ source: ALLOWED, entries, unseen }, null, 4));
    } else {
        console.log(report(entries, unseen));
    }

    if (CHECK && unseen.length > 0) process.exit(1);
}

await main();
