import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export class NoLockfileError extends Error {
    constructor(root) {
        super(
            `No package-lock.json or pnpm-lock.yaml found at ${root}. ` +
                'The lockfile is the evidence here — it records what was actually installed, and it must be committed.'
        );
        this.name = 'NoLockfileError';
    }
}

/**
 * Match every `name@<spec>:` key under a pnpm lockfile's `packages:` / `snapshots:` sections.
 *
 * Deliberately matches non-semver specs too — a tarball URL, a git ref, a `file:` path. The
 * spec is classified afterwards, because refusing to match them here would silently drop
 * exactly the entries most worth looking at.
 */
const PNPM_KEY = /^\s{2,}'?\/?((?:@[^/\s'"]+\/)?[^@/\s'"]+)@([^\s'"]+?)'?:\s*$/gm;

const SEMVER_HEAD = /^\d+\.\d+\.\d+/;

/**
 * Every package in the tree, from either lockfile format.
 *
 * `version` is null when the spec is not semver. That distinction is the point: being unable
 * to read a version is not the same as the version being safe, and the caller must be able to
 * tell the two apart.
 *
 * @returns {Array<{name: string, version: string|null, raw?: string}>}
 */
export function readLock(root) {
    const npmLock = join(root, 'package-lock.json');
    const pnpmLock = join(root, 'pnpm-lock.yaml');

    if (!existsSync(npmLock) && !existsSync(pnpmLock)) throw new NoLockfileError(root);

    const out = [];

    if (existsSync(npmLock)) {
        const lock = JSON.parse(readFileSync(npmLock, 'utf8'));
        for (const [path, meta] of Object.entries(lock.packages ?? {})) {
            if (!path.startsWith('node_modules/') && !path.includes('/node_modules/')) continue;
            if (!meta?.version) continue;
            // A nested dependency's key is a path; its real name is the last segment after
            // the final node_modules/.
            const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
            out.push({ name, version: meta.version });
        }
    }

    if (existsSync(pnpmLock)) {
        const text = readFileSync(pnpmLock, 'utf8');
        const seen = new Set();
        for (const m of text.matchAll(PNPM_KEY)) {
            const key = `${m[1]}@${m[2]}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const spec = m[2].split('(')[0]; // drop pnpm's peer-deps suffix
            out.push({ name: m[1], version: SEMVER_HEAD.test(spec) ? spec : null, raw: m[2] });
        }
    }

    return out;
}
