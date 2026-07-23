import { FIRST_COMMERCIAL, ALWAYS_COMMERCIAL, isPrimeTekPackage } from './boundary.mjs';

/**
 * Compare two versions on their release triple.
 *
 * The prerelease suffix is dropped on purpose. The licence changed AT a major, so
 * `22.0.0-rc.1` is a release candidate OF the commercial major and must not be waved
 * through by the semver rule that a prerelease precedes its release.
 */
function cmp(a, b) {
    const pa = a.split('-')[0].split('.').map(Number);
    const pb = b.split('-')[0].split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
    }
    return 0;
}

/**
 * Classify a dependency list against the licence boundary.
 *
 * Pure: no filesystem, no network, no process exit. Everything that decides whether someone's
 * build goes red lives here and is unit-testable without a project on disk.
 *
 * @param {Array<{name: string, version: string|null, raw?: string}>} packages
 *        `version` is null when the spec is not semver (tarball URL, git ref, `file:`).
 * @returns {{violations: Array<{name, version, reason}>, seen: Array<{name, version}>}}
 */
export function detect(packages) {
    const violations = [];
    const seen = [];

    for (const { name, version, raw } of packages) {
        if (ALWAYS_COMMERCIAL.includes(name)) {
            violations.push({ name, version: version ?? raw, reason: 'commercial in every version' });
            continue;
        }

        const floor = FIRST_COMMERCIAL[name];
        if (!floor) {
            // Fail closed. A PrimeTek package this table has never seen is UNVERIFIED, and
            // unverified is not clean. Skipping it here is how a package published after
            // this table was written would be reported as "all clear" — the report would be
            // confident and wrong, about a legal question.
            if (isPrimeTekPackage(name)) {
                violations.push({
                    name,
                    version: version ?? raw,
                    reason: 'not recorded in the boundary table — the licence could not be verified'
                });
            }
            continue;
        }

        if (version === null || version === undefined) {
            violations.push({
                name,
                version: raw,
                reason: 'not a semver version — the licence could not be verified automatically'
            });
            continue;
        }

        seen.push({ name, version });
        if (cmp(version, floor) >= 0) {
            violations.push({ name, version, reason: `>= ${floor} is the commercial PrimeUI licence` });
        }
    }

    return { violations, seen };
}
