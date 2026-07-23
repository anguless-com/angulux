import { FIRST_COMMERCIAL, ALWAYS_COMMERCIAL, isPrimeTekPackage } from './boundary.mjs';

/**
 * Compare two versions on their release triple.
 *
 * The prerelease suffix is dropped on purpose. The licence changed AT a major, so
 * `22.0.0-rc.1` is a release candidate OF the commercial major and must not be waved
 * through by the semver rule that a prerelease precedes its release.
 */
function release(version) {
    // Strip BOTH the prerelease suffix and the build metadata. Dropping only `-` left
    // `Number('0+build')` === NaN, every comparison with NaN false, and a commercial version
    // reported as clean — a false green on precisely what this package exists to catch.
    return String(version).split('+')[0].split('-')[0].split('.');
}

/**
 * Compare two versions on their release triple.
 *
 * A segment that is not a number yields `null`, and the caller treats an incomparable
 * version as unverified rather than as below the boundary. "I could not read this" must never
 * collapse into "this is fine".
 *
 * @returns {number|null} null when either version cannot be read
 */
function cmp(a, b) {
    const pa = release(a);
    const pb = release(b);
    for (let i = 0; i < 3; i++) {
        const na = pa[i] === undefined ? 0 : Number(pa[i]);
        const nb = pb[i] === undefined ? 0 : Number(pb[i]);
        if (Number.isNaN(na) || Number.isNaN(nb)) return null;
        if (na !== nb) return na - nb;
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
            violations.push({ name, version: version ?? raw, kind: 'commercial', reason: 'commercial in every version' });
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
                    kind: 'unverified',
                    reason: 'not recorded in the boundary table — the licence could not be verified'
                });
            }
            continue;
        }

        if (version === null || version === undefined) {
            violations.push({
                name,
                version: raw,
                kind: 'unverified',
                reason: 'not a semver version — the licence could not be verified automatically'
            });
            continue;
        }

        const order = cmp(version, floor);
        if (order === null) {
            violations.push({
                name,
                version,
                kind: 'unverified',
                reason: `could not be compared against the ${floor} boundary — the version is not readable`
            });
            continue;
        }

        seen.push({ name, version });
        if (order >= 0) {
            violations.push({ name, version, kind: 'commercial', reason: `>= ${floor} is the commercial PrimeUI licence` });
        }
    }

    return { violations, seen };
}
