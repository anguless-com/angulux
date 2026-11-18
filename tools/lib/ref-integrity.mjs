/**
 * ref-integrity — the audit that the MIT evidence clones in `ref/` are still evidence.
 *
 * WHAT IT STOPS: an edited, re-pointed or half-rebuilt clone under `ref/`. Constitution P2
 * says `ref/primeng` and `ref/primeuix` are read-only: they are the unmodified upstream that
 * every "this was inherited, that was written here" claim is measured against, and
 * PROVENANCE.md section 2 records the exact commit of each.
 *
 * WHY A GATE: until now P2 was a sentence. `ref-quarantine` audits what is INSTALLED in
 * `ref/` against the licence register; it never asked whether the source checkouts
 * themselves had been touched. One stray build aimed at an `angular.json` in there, one
 * editor "fix" on the wrong tab, one `git pull`, and the clone stops being the recorded
 * commit while every gate stays green. A modified clone does not look modified; it only
 * stops proving anything.
 *
 * So for every origin PROVENANCE.md section 2 records, the clone under `ref/` must be
 *
 *     at exactly the recorded commit, and clean (no modified, deleted or untracked file).
 *
 * THE FIX when it fails: never repair the clone in place. Delete it and clone it again at
 * the recorded commit (the commands are in `.gitignore`), or, if the origin really moved,
 * change PROVENANCE.md in a reviewed commit.
 *
 * WHAT IT DOES NOT CLAIM: it does not compare file contents against a hash outside git, so
 * it trusts the clone's own object store; `provenance/` holds the offline archive for that
 * stronger question. Files git ignores inside a clone are not seen. And where `ref/` is
 * absent (CI, a fresh clone) it audits nothing and says so.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The section of PROVENANCE.md that records the origins. Matched as a literal prefix. */
export const ORIGIN_HEADING = '## 2. Exact origin';

/** One origin row: the source repository and the full commit it was forked at. */
const ROW = /^\|\s*`github\.com\/[\w.-]+\/([\w.-]+)`\s*\|[^|]*\|\s*`([0-9a-f]{40})`\s*\|/gm;

/**
 * Read the recorded origins out of PROVENANCE.md.
 *
 * A renamed heading or a reshaped table yields an EMPTY list, and the caller treats an empty
 * list as a failure: a doc parser that finds nothing must never be read as "nothing to check".
 */
export function parseOrigins(provenanceText) {
    const at = provenanceText.indexOf(ORIGIN_HEADING);
    if (at === -1) return [];

    const rest = provenanceText.slice(at + ORIGIN_HEADING.length);
    const end = rest.search(/\n## /);
    const section = end === -1 ? rest : rest.slice(0, end);

    return [...section.matchAll(ROW)].map((m) => ({ path: `ref/${m[1]}`, commit: m[2] }));
}

/**
 * Judge what was observed against what is recorded.
 *
 * Pure: no filesystem, no git. `observed` maps a path to `{ head, dirty }`, to `{ error }`
 * when git could not answer, or has no entry when the clone is not on disk.
 */
export function judgeOrigins(origins, observed) {
    const problems = [];
    const verified = [];
    const absent = [];

    for (const o of origins) {
        const seen = observed.get(o.path);
        if (!seen) {
            absent.push(o);
            continue;
        }
        if (seen.error) {
            problems.push({ path: o.path, what: `git could not read this clone: ${seen.error}` });
            continue;
        }
        if (seen.head !== o.commit) {
            problems.push({ path: o.path, what: `HEAD is ${seen.head}, PROVENANCE.md records ${o.commit}` });
        }
        if (seen.dirty.length) {
            const shown = seen.dirty.slice(0, 5).join(', ');
            const more = seen.dirty.length > 5 ? `, and ${seen.dirty.length - 5} more` : '';
            problems.push({ path: o.path, what: `${seen.dirty.length} modified or untracked path(s): ${shown}${more}` });
        }
        if (seen.head === o.commit && !seen.dirty.length) verified.push(o);
    }

    return { problems, verified, absent };
}

const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Ask git what is actually on disk for one clone. */
function observe(dir) {
    try {
        // A directory without its own .git would answer for the ENCLOSING repository, which
        // is this one: the right HEAD question asked of the wrong repository.
        if (!existsSync(join(dir, '.git'))) return { error: 'no .git here, so this is not the recorded clone' };
        const head = git(dir, ['rev-parse', 'HEAD']).trim();
        const dirty = git(dir, ['status', '--porcelain'])
            .split('\n')
            .filter(Boolean)
            .map((l) => l.slice(3));
        return { head, dirty };
    } catch (e) {
        return { error: String(e.stderr || e.message).trim().split('\n')[0] };
    }
}

/**
 * The whole audit, as report lines plus a pass/fail.
 *
 * @returns {{ok: boolean, lines: string[]}}
 */
export function auditRefIntegrity(root) {
    const refDir = join(root, 'ref');
    if (!existsSync(refDir)) {
        // Not a tick, for the same reason ref-quarantine does not print one.
        return { ok: true, lines: ['· ref-integrity: no ref/ directory — nothing audited (expected in CI; ref/ is gitignored).'] };
    }

    const provenancePath = join(root, 'PROVENANCE.md');
    if (!existsSync(provenancePath)) {
        return { ok: false, lines: ['✗ ref-integrity: PROVENANCE.md is missing — there is no recorded commit to check ref/ against.'] };
    }

    const origins = parseOrigins(readFileSync(provenancePath, 'utf8'));
    if (!origins.length) {
        return {
            ok: false,
            lines: [`✗ ref-integrity: no origin row found under "${ORIGIN_HEADING}" in PROVENANCE.md — the table moved or changed shape, so nothing could be checked.`]
        };
    }

    const observed = new Map();
    for (const o of origins) {
        const dir = join(root, o.path);
        if (existsSync(dir)) observed.set(o.path, observe(dir));
    }

    const { problems, verified, absent } = judgeOrigins(origins, observed);
    const lines = [];

    if (problems.length) {
        lines.push('✗ ref-integrity: AN EVIDENCE CLONE IN ref/ IS NOT THE COMMIT PROVENANCE.md RECORDS, UNMODIFIED', '');
        for (const p of problems) lines.push(`   ${p.path} → ${p.what}`);
        lines.push(
            '',
            '  ref/ is read-only (Constitution P2). Do not repair the clone in place: delete it and',
            '  clone it again at the recorded commit (the commands are in .gitignore).'
        );
        return { ok: false, lines };
    }

    if (verified.length) {
        lines.push(`✓ ref-integrity: ${verified.length} evidence clone(s) at the recorded commit, unmodified.`);
        for (const v of verified) lines.push(`    ${v.path} @ ${v.commit.slice(0, 7)}`);
    } else {
        lines.push('· ref-integrity: ref/ exists but holds none of the recorded clones — nothing audited.');
    }
    for (const a of absent) lines.push(`    ${a.path} — not on disk, not audited`);
    return { ok: true, lines };
}
