#!/usr/bin/env node
/**
 * check-publishable — inspects the ACTUAL tarballs, not the directories they came from.
 *
 * WHY THIS EXISTS, precisely:
 *
 * `postbuild` resolves `workspace:` ranges for the main package, because that one is
 * published from `dist/`, a directory the build writes. The four forked packages are
 * published from their own source directory, and nothing resolved theirs. So
 * `angulux-styled@1.0.0` would have gone to the registry declaring
 * `"@anguless/angulux-utils": "workspace:^"`, and every consumer's install would have died with
 * `EUNSUPPORTEDPROTOCOL: Unsupported URL Type "workspace:"`. A published version cannot be
 * taken back.
 *
 * It survived every existing check for two separate reasons, and both are the point:
 *
 *   1. The release workflow's guard globbed `packages/angulux-*` + `/dist/**\/package.json`.
 *      tsup emits no package.json into dist, so the guard read zero files and passed. A
 *      check that looks in the wrong place does not report "I found nothing to check" — it
 *      reports success.
 *
 *   2. A manual inspection used `tar --wildcards`, which macOS bsdtar does not support. The
 *      command errored, produced no output, and `grep -c` dutifully counted zero matches.
 *
 * Both are the same failure: **asking a question of something that was not the artifact**.
 * So this gate packs each package and reads `package/package.json` out of the tarball —
 * the exact bytes npm would receive. There is nothing left to be wrong about.
 *
 * It is deliberately NOT part of `npm run check`. That suite is the fast gates in about three
 * seconds and stays that way; this one needs a completed build. It runs in CI after the
 * build, and in the release workflow before anything irreversible happens.
 *
 * Usage: node tools/check-publishable.mjs
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every unit that reaches the registry, and the directory it is published FROM.
 * The main package publishes from dist/ (publishConfig.directory); the forked packages
 * publish from their own root.
 */
const PUBLISHABLE = [
    { name: '@anguless/angulux', dir: 'packages/angulux/dist' },
    { name: '@anguless/angulux-styled', dir: 'packages/angulux-styled' },
    { name: '@anguless/angulux-utils', dir: 'packages/angulux-utils' },
    { name: '@anguless/angulux-styles', dir: 'packages/angulux-styles' },
    { name: '@anguless/angulux-motion', dir: 'packages/angulux-motion' },
    // Unscoped on purpose: its audience is PrimeNG/PrimeVue/PrimeReact users who have never
    // heard of the anguless org. `zeroDeps` is a product claim, so it is checked on the
    // tarball rather than trusted from the source manifest.
    { name: 'angulux-license-guard', dir: 'packages/angulux-license-guard', zeroDeps: true },
    { name: 'angulux-migrate', dir: 'packages/angulux-migrate', zeroDeps: true }
];

const problems = [];
const staging = mkdtempSync(join(tmpdir(), 'angulux-publishable-'));

/**
 * On Windows `corepack` is a `.cmd` shim: `execFileSync` resolves the literal name only
 * (ENOENT), and since the CVE-2024-27980 fix Node refuses to spawn `.cmd` without a shell
 * at all (EINVAL). So this gate had NEVER run on a Windows machine — only in CI. The shell
 * is enabled on win32 alone, and the one interpolated argument is quoted, because a shell
 * is a quoting surface and the staging path is a temp directory we do not control.
 */
const IS_WIN = process.platform === 'win32';
const COREPACK = IS_WIN ? 'corepack.cmd' : 'corepack';
const shellArg = (s) => (IS_WIN && /\s/.test(s) ? `"${s}"` : s);

/**
 * Read one file out of a tarball. Uses `tar -O`, which bsdtar and GNU tar both support.
 *
 * The archive is named by BASENAME with `cwd` set to its directory, never by absolute path:
 * GNU tar reads a leading `C:` as a remote host spec ("Cannot connect to C: resolve failed"),
 * and `--force-local` — the obvious fix — is GNU-only, so it would trade a Windows break for
 * a macOS one. Removing the colon from the argument keeps one code path for all three.
 */
function readFromTarball(tarball, member) {
    return execFileSync('tar', ['xzOf', basename(tarball), member], {
        cwd: dirname(tarball),
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024
    });
}

function listTarball(tarball) {
    return execFileSync('tar', ['tzf', basename(tarball)], {
        cwd: dirname(tarball),
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024
    })
        .split('\n')
        .filter(Boolean);
}

try {
    for (const { name, dir, zeroDeps } of PUBLISHABLE) {
        const abs = resolve(repoRoot, dir);

        if (!existsSync(abs)) {
            problems.push([name, `${dir} does not exist — build before running this gate`]);
            continue;
        }

        // pnpm, not npm: `pnpm pack` resolves the workspace: protocol into a real range,
        // which is exactly the step that was missing. Packing with npm here would reproduce
        // the bug and then certify it as fine.
        let tarball;
        try {
            const out = execFileSync(COREPACK, ['pnpm', 'pack', '--pack-destination', shellArg(staging)], {
                cwd: abs,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: IS_WIN
            });
            const line = out.trim().split('\n').filter(Boolean).pop();
            tarball = line && line.endsWith('.tgz') ? resolve(abs, line) : null;
            if (!tarball || !existsSync(tarball)) {
                const found = readdirSync(staging).filter((f) => f.startsWith(name + '-') && f.endsWith('.tgz'));
                tarball = found.length ? join(staging, found[found.length - 1]) : null;
            }
        } catch (e) {
            problems.push([name, `pnpm pack failed: ${String(e.stderr || e.message).split('\n')[0]}`]);
            continue;
        }

        if (!tarball) {
            problems.push([name, 'pnpm pack produced no tarball']);
            continue;
        }

        const pkg = JSON.parse(readFromTarball(tarball, 'package/package.json'));
        const entries = listTarball(tarball);

        // 1. The failure that started all this. Unresolved protocol specifiers break every
        //    consumer install, and the version is burned once published.
        for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
            for (const [dep, range] of Object.entries(pkg[field] || {})) {
                if (typeof range === 'string' && /^(workspace|catalog):/.test(range)) {
                    problems.push([name, `${field}.${dep} = "${range}" — consumers get EUNSUPPORTEDPROTOCOL`]);
                }
            }
        }

        // 2. MIT requires the copyright notice to travel with every distribution.
        if (!entries.some((e) => /^package\/LICENSE(\.md|\.txt)?$/i.test(e))) {
            problems.push([name, 'no LICENSE in the tarball — MIT requires the notice in every distribution']);
        }

        // 3. Publish metadata that is wrong in ways a scanner acts on.
        if (pkg.license !== 'MIT') problems.push([name, `license is "${pkg.license}", expected MIT`]);
        if (pkg.private === true) problems.push([name, 'private: true — publish would be refused']);
        if (pkg.publishConfig?.access && pkg.publishConfig.access !== 'public') {
            problems.push([name, `publishConfig.access is "${pkg.publishConfig.access}", expected public`]);
        }
        if (!pkg.repository?.url) problems.push([name, 'no repository.url — the npm page would be blank']);
        if (!pkg.version) problems.push([name, 'no version']);

        // 4. A "zero dependencies" claim is part of what this package sells: a tool that
        //    exists to prove a licence claim must not drag in a supply chain of its own.
        //    Read off the tarball, because that is what a consumer installs.
        if (zeroDeps && Object.keys(pkg.dependencies || {}).length) {
            problems.push([name, `declares ${Object.keys(pkg.dependencies).length} runtime dependency(ies) but claims zero`]);
        }

        // 5. The exports map is a PROMISE ABOUT PATHS, and nothing was checking it.
        //    tsup derives its entry keys from a glob, and `glob` returns PLATFORM separators.
        //    On Windows `src\index.ts` never matched the `/^src\//` strip, so every artifact
        //    landed one directory deeper than the manifest says — `dist/src/index.mjs` where
        //    `exports` promised `dist/index.mjs`. tsup still exited 0. Measured on both
        //    glob 11.1.0 and 13.0.6, so this is latent, not a version regression.
        const inTarball = (target) => entries.includes('package/' + String(target).replace(/^\.\//, ''));
        const promised = new Set();
        for (const field of ['main', 'module', 'types']) {
            if (typeof pkg[field] === 'string') promised.add(pkg[field]);
        }
        (function collect(node) {
            if (typeof node === 'string') promised.add(node);
            else if (node && typeof node === 'object') Object.values(node).forEach(collect);
        })(pkg.exports);
        for (const target of promised) {
            // Wildcard patterns are covered by the invariant below — a `*` in an exports
            // target matches across separators, so they cannot be checked by existence.
            if (target.includes('*')) continue;
            if (!inTarball(target)) {
                problems.push([name, `exports/main/module promises ${target}, which is NOT in the tarball`]);
            }
        }

        // 6. The invariant that makes the wildcard subpaths checkable at all.
        //    `"./*": "./dist/*/index.mjs"` still RESOLVES against `dist/src/button/index.mjs`
        //    (an exports `*` matches across separators), so `<pkg>/button` broke for consumers
        //    while `<pkg>/src/button` quietly worked and no build ever failed. dist mirrors
        //    module names; it must never carry the source prefix.
        const leaked = entries.filter((e) => e.startsWith('package/dist/src/'));
        if (leaked.length) {
            problems.push([
                name,
                `${leaked.length} file(s) emitted under dist/src/ (e.g. ${leaked[0].replace('package/', '')}) — ` +
                    'the build leaked the source prefix into the artifact layout'
            ]);
        }

        if (!problems.some((p) => p[0] === name)) {
            const deps = Object.keys(pkg.dependencies || {}).length;
            console.log(`  ✓ ${name}@${pkg.version} — ${entries.length} files, ${deps} runtime dep(s), LICENSE present`);
        }
    }
} finally {
    rmSync(staging, { recursive: true, force: true });
}

if (!problems.length) {
    console.log(`✓ check-publishable: ${PUBLISHABLE.length} tarballs inspected, all publishable.`);
    process.exit(0);
}

console.error('\n✗ A PACKAGE IS NOT SAFE TO PUBLISH\n');
let last = null;
for (const [name, problem] of problems) {
    if (name !== last) {
        console.error(`  ${name}`);
        last = name;
    }
    console.error(`      ${problem}`);
}
console.error('\n  Publishing cannot be undone: a version is burned even after `npm unpublish`.');
console.error('  These were read out of the real tarballs, not out of the source directories.\n');
process.exit(1);
