/**
 * manifest-pins — the half of Constitution P4 that `check:catalog` did not read.
 *
 * WHAT IT STOPS: an installed dependency whose version is a range. `check:catalog` used to
 * read `pnpm-workspace.yaml` and nothing else, so the catalog was exact while ten
 * dependencies sat in package manifests as `^` or `~`, and ten of the eleven
 * `pnpm.overrides` did too. The gate was green over all twenty. The lockfile held the
 * versions, which is a different promise: a lockfile says what was resolved last time, a
 * range says what may be resolved next time, and the one command that regenerates the first
 * from the second is the command the exact-pin rule exists to make harmless.
 *
 * THE RULE, for `dependencies`, `devDependencies` and `optionalDependencies` of every
 * workspace manifest: a specifier is one of
 *
 *     workspace:…          a workspace member, never fetched from a registry
 *     catalog: / catalog:x a catalog entry that EXISTS (the catalog's own discipline is
 *                          checked where the catalog is read)
 *     1.2.3                an exact version
 *
 * and nothing else: no range, no dist-tag, no git or file URL, no `npm:` alias.
 *
 * `peerDependencies` are exempt on purpose. They are never installed; they declare what a
 * consumer may bring, and pinning one would break every consumer on the next minor.
 *
 * OVERRIDES (`pnpm.overrides`, and `resolutions`, which pnpm also honours) are held to the
 * same rule for a stronger reason: an override replaces what every dependent asked for, so a
 * ranged override is a range applied to the whole tree at once.
 *
 * Pure: no filesystem. The caller reads the files and passes what it read.
 */

import { resolveCatalog } from '../workspace-catalog.mjs';

/** Fields whose entries end up in node_modules. */
export const INSTALLED_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];

export const isExact = (v) => typeof v === 'string' && /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v);

/**
 * Judge one manifest.
 *
 * @param {string} where  the manifest's path, for the message
 * @param {object} manifest  the parsed package.json
 * @param {object} ws  the parsed workspace file
 * @returns {{problems: string[], examined: number}}
 */
export function judgeManifest(where, manifest, ws) {
    const problems = [];
    let examined = 0;

    for (const field of INSTALLED_FIELDS) {
        for (const [dep, spec] of Object.entries(manifest[field] ?? {})) {
            examined++;
            if (typeof spec !== 'string') {
                problems.push(`${where} ${field} "${dep}" has a specifier that is not a string`);
                continue;
            }
            if (spec.startsWith('workspace:')) continue;
            if (spec.startsWith('catalog:')) {
                if (resolveCatalog(spec, dep, ws) === undefined) {
                    problems.push(`${where} ${field} "${dep}: ${spec}" points at a catalog entry pnpm-workspace.yaml does not define`);
                }
                continue;
            }
            if (isExact(spec)) continue;
            problems.push(`${where} ${field} "${dep}: ${spec}" is installed, so it must be an exact version or a catalog entry — no range, tag or URL`);
        }
    }

    return { problems, examined };
}

/**
 * Judge the root manifest's forced versions.
 *
 * @returns {{problems: string[], examined: number}}
 */
export function judgeOverrides(where, manifest) {
    const problems = [];
    let examined = 0;

    const blocks = [
        ['pnpm.overrides', manifest.pnpm?.overrides],
        ['resolutions', manifest.resolutions]
    ];
    for (const [name, block] of blocks) {
        for (const [selector, spec] of Object.entries(block ?? {})) {
            examined++;
            if (!isExact(spec)) {
                problems.push(`${where} ${name} "${selector}: ${spec}" forces a version on the whole tree, so it must be exact`);
            }
        }
    }

    return { problems, examined };
}
