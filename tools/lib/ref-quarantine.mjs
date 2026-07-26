/**
 * ref-quarantine — the audit for licence-flagged material parked in `ref/`.
 *
 * WHY THIS EXISTS: `check-prime-license` asks one question — "is anything commercial in the
 * dependency tree we build?" — and `ref/` is not in that tree. It is gitignored, never
 * committed, and never built against, so the guard walked straight past it. That is the
 * correct scope for the published tool and the wrong scope for this repository: a commercial
 * PrimeNG install had been sitting in `ref/primeng.dev` for days, and the gate suite reported
 * 12/12 green the whole time. Green because nothing was wrong, or green because nobody
 * looked? The two are indistinguishable from the outside, which is the failure this repo has
 * already paid for once (`learning-false-green-hoi-nham-artifact`).
 *
 * So this does NOT re-ask the build question. It asks the register question:
 *
 *     everything in ref/ that the licence guard flags must be written down in
 *     PROVENANCE.md, and everything written down there must still be in ref/.
 *
 * "Flagged" is deliberately wider than "commercial". The guard fails closed, so a PrimeTek
 * package its boundary table has never seen comes back `unverified` — which is a statement
 * about the table, not about the package. `@primeuix/mcp` is MIT and still lands here. The
 * register is where a human writes down which of the two it actually turned out to be;
 * calling every row "non-MIT" in a public legal document would be a false claim.
 *
 * Both directions fail. An undeclared install is contamination nobody recorded; a declared
 * install that has vanished is a false statement in a public legal document. Neither is
 * better than the other, so neither gets to pass.
 *
 * The boundary table is NOT redeclared here — it is imported from the one place it lives,
 * `packages/angulux-license-guard/src/boundary.mjs`, through `detect()`. Two copies of a
 * legal record is a record that can disagree with itself.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLock, NoLockfileError } from '../../packages/angulux-license-guard/src/lockfile.mjs';
import { detect } from '../../packages/angulux-license-guard/src/detect.mjs';

/** The section of PROVENANCE.md that holds the register. Matched as a literal prefix. */
export const REGISTRY_HEADING = '## 7. Quarantined reference material';

/**
 * A row of the register.
 *
 * The columns are fixed and all four are load-bearing — `kind` included. A package that moves
 * from `unverified` to `commercial` (because someone updated the boundary table) is a
 * materially different claim about a third party, and the register has to be re-read by a
 * human when that happens rather than quietly still matching on name and version.
 */
const ROW =
    /^\|\s*`(ref\/[^`|]+)`\s*\|\s*`([^`|]+)`\s*\|\s*`([^`|]+)`\s*\|\s*(commercial|unverified)\s*\|/gm;

/**
 * Read the register out of PROVENANCE.md.
 *
 * A renamed heading or a reshaped table yields an EMPTY register, not a crash — and an empty
 * register makes every real finding undeclared, so the gate goes red and names them. That is
 * deliberate: the failure mode of a doc parser must be "too strict", never "waved through".
 */
export function parseRegistry(provenanceText) {
    const at = provenanceText.indexOf(REGISTRY_HEADING);
    if (at === -1) return [];

    const rest = provenanceText.slice(at + REGISTRY_HEADING.length);
    const end = rest.search(/\n## /);
    const section = end === -1 ? rest : rest.slice(0, end);

    return [...section.matchAll(ROW)].map((m) => ({
        path: m[1],
        name: m[2],
        version: m[3],
        kind: m[4]
    }));
}

/**
 * Walk `ref/` and classify what is installed in each subdirectory.
 *
 * `present: false` means the directory is not on disk at all — the normal state in CI, where
 * `ref/` is gitignored. The caller must SAY so rather than printing a tick, because "checked
 * three trees" and "checked nothing" are different results.
 */
export function scanRefTree(root) {
    const refDir = join(root, 'ref');
    if (!existsSync(refDir)) return { present: false, dirs: [], findings: [], notes: [] };

    const dirs = readdirSync(refDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

    const findings = [];
    const notes = [];

    for (const dirName of dirs) {
        const dir = join(refDir, dirName);
        const path = `ref/${dirName}`;

        let packages;
        try {
            packages = readLock(dir);
        } catch (e) {
            if (e instanceof NoLockfileError) {
                // A bare source checkout with nothing installed is the expected shape for the
                // MIT evidence clones, and it is genuinely nothing to declare. But a tree with
                // node_modules and no lockfile is the opposite: something IS installed and
                // there is no record of what. That is unverifiable, and unverifiable is not clean.
                if (existsSync(join(dir, 'node_modules'))) {
                    findings.push({
                        path,
                        name: '(whole tree)',
                        version: '(no lockfile)',
                        kind: 'unverified',
                        reason: 'node_modules is present but no lockfile records what is in it'
                    });
                } else {
                    notes.push(`${path} — source checkout, nothing installed`);
                }
                continue;
            }
            findings.push({
                path,
                name: '(whole tree)',
                version: '(unreadable lockfile)',
                kind: 'unverified',
                reason: e.message
            });
            continue;
        }

        const { violations } = detect(packages);
        for (const v of violations) {
            findings.push({
                path,
                name: v.name,
                version: String(v.version),
                kind: v.kind,
                reason: v.reason
            });
        }
    }

    return { present: true, dirs, findings, notes };
}

const keyOf = (x) => `${x.path} :: ${x.name}@${x.version}`;

/**
 * Compare what is on disk against what is written down.
 *
 * Pure — no filesystem, no exit. Every decision that turns someone's build red is testable
 * here without a repository on disk.
 */
export function reconcile(findings, registry) {
    const recorded = new Map(registry.map((r) => [keyOf(r), r]));
    const onDisk = new Map(findings.map((f) => [keyOf(f), f]));

    const undeclared = [];
    const misclassified = [];
    const matched = [];

    for (const f of findings) {
        const row = recorded.get(keyOf(f));
        if (!row) undeclared.push(f);
        else if (row.kind !== f.kind) misclassified.push({ found: f, recorded: row });
        else matched.push(f);
    }

    const stale = registry.filter((r) => !onDisk.has(keyOf(r)));

    return { undeclared, misclassified, stale, matched };
}

/**
 * The whole audit, as report lines plus a pass/fail.
 *
 * @returns {{ok: boolean, lines: string[]}}
 */
export function auditRefQuarantine(root) {
    const lines = [];
    const { present, dirs, findings, notes } = scanRefTree(root);

    if (!present) {
        // Not a tick. This states plainly that the audit looked at nothing, so a green run in
        // CI can never be mistaken for a green run on a machine that actually has ref/.
        lines.push('· ref-quarantine: no ref/ directory — nothing audited (expected in CI; ref/ is gitignored).');
        return { ok: true, lines };
    }

    const provenancePath = join(root, 'PROVENANCE.md');
    if (!existsSync(provenancePath)) {
        lines.push('✗ ref-quarantine: PROVENANCE.md is missing — there is no register to check ref/ against.');
        return { ok: false, lines };
    }

    const registry = parseRegistry(readFileSync(provenancePath, 'utf8'));
    const { undeclared, misclassified, stale, matched } = reconcile(findings, registry);

    if (undeclared.length) {
        lines.push(
            '✗ ref-quarantine: FLAGGED MATERIAL IN ref/ THAT PROVENANCE.md DOES NOT DECLARE',
            ''
        );
        for (const f of undeclared) lines.push(`   ${f.path} → ${f.name}@${f.version}  [${f.kind}]`, `      ${f.reason}`);
        lines.push(
            '',
            `  Fix: record each one in "${REGISTRY_HEADING}" in PROVENANCE.md, or remove it from ref/.`,
            '  Keeping it undeclared is the one option that is not available.'
        );
    }

    if (misclassified.length) {
        if (lines.length) lines.push('');
        lines.push('✗ ref-quarantine: THE REGISTER DISAGREES WITH THE BOUNDARY TABLE', '');
        for (const { found, recorded } of misclassified) {
            lines.push(`   ${found.path} → ${found.name}@${found.version}`, `      recorded as "${recorded.kind}", now detected as "${found.kind}"`);
        }
        lines.push('', '  A licence claim about a third party changed. Re-read it, then update PROVENANCE.md.');
    }

    if (stale.length) {
        if (lines.length) lines.push('');
        lines.push('✗ ref-quarantine: PROVENANCE.md DECLARES MATERIAL THAT IS NOT THERE', '');
        for (const r of stale) lines.push(`   ${r.path} → ${r.name}@${r.version}  [${r.kind}]`);
        lines.push(
            '',
            '  PROVENANCE.md is public and is a legal record. A row describing something that is',
            '  no longer on disk is a false statement in it. Fix: delete the row.'
        );
    }

    if (undeclared.length || misclassified.length || stale.length) return { ok: false, lines };

    const scope = `${dirs.length} director${dirs.length === 1 ? 'y' : 'ies'}`;
    if (!matched.length) {
        lines.push(`✓ ref-quarantine: ${scope} in ref/, nothing the licence guard flags.`);
    } else {
        lines.push(`✓ ref-quarantine: ${scope} in ref/, ${matched.length} flagged item(s), all declared in PROVENANCE.md.`);
        for (const f of matched) lines.push(`    ${f.path} → ${f.name}@${f.version}  [${f.kind}]`);
    }
    for (const n of notes) lines.push(`    ${n}`);
    return { ok: true, lines };
}
