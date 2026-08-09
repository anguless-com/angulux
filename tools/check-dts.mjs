#!/usr/bin/env node
/**
 * check-dts — type-checks the SHIPPED declarations with `skipLibCheck: false`.
 *
 * WHY THIS EXISTS:
 *
 * Every tsconfig in this repository sets `skipLibCheck: true`. That is the sane default for
 * building — it stops a broken `.d.ts` in some transitive dependency from failing our build —
 * but it has a consequence nobody notices until a consumer reports it: **we never type-check
 * our own emitted declarations.** They are `.d.ts` files, so `skipLibCheck` skips them too.
 *
 * A consumer who sets `skipLibCheck: false` — a reasonable choice, and the default answer to
 * "why is my editor not catching this" — compiles our declarations for real. If they do not
 * stand up on their own, that consumer's build breaks and ours stays green. The failure is
 * invisible from inside this repository by construction.
 *
 * This is not hypothetical. PrimeNG shipped exactly this defect in 22.1.0-rc.1, titled
 * "Chart: Types break builds with skipLibCheck: false" on their public changelog. Checked
 * against angulux on 2026-08-09: clean, with zero chart.js declarations even entering the
 * program, because our chart types everything as `any`. That is immunity by weak typing, not
 * by design, and it lasts exactly until someone types a public surface properly. A defect
 * class that only a downstream consumer can observe needs a gate here, not a hope.
 *
 * WHAT IT ACTUALLY CHECKS:
 *
 * The emitted `.d.ts` under `packages/angulux/dist/types`, compiled as their own program with
 * `skipLibCheck: false`. Declarations they import — `@angular/*`, rxjs — are pulled in and
 * checked with them, which is the point: it is the consumer's program, reproduced.
 *
 * WHY IT IS NOT ONE OF THE `npm run check` GATES:
 *
 * Same reason as `check:publishable`, and the same precedent. That suite is the fast gates,
 * runs in about three seconds, and needs no build. This one has nothing to look at until
 * `ng build angulux` has run, so it belongs after the build, next to the other check that
 * inspects real artifacts rather than the source they came from.
 *
 * THE SELF-TEST, AND WHY IT IS NOT OPTIONAL:
 *
 * The failure mode this repository keeps hitting is not "the check said no", it is "the check
 * was asked the wrong question and answered success" — a glob that matched zero files, a tar
 * flag the platform ignored. A type-check is especially prone to it: point `tsc` at nothing,
 * or at files whose imports all fail to resolve, and a green result means nothing at all.
 *
 * So a green run here is only reported after a deliberately broken declaration has been put
 * through the same program and `tsc` has been observed rejecting it. If the poison passes,
 * the harness is not checking anything and this exits non-zero saying so, even though the
 * real check found no errors.
 *
 * Usage: node tools/check-dts.mjs        (after `pnpm --filter @anguless/angulux run build`)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const typesDir = join(repoRoot, 'packages/angulux/dist/types');
const tsc = join(repoRoot, 'node_modules/typescript/bin/tsc');

const fail = (headline, ...detail) => {
    console.error(`\n✗ ${headline}\n`);
    for (const line of detail) console.error(`  ${line}`);
    console.error('');
    process.exit(1);
};

// ---------------------------------------------------------------------------
// 1. Refuse to run against nothing. "No files found" must never read as success.
// ---------------------------------------------------------------------------

if (!existsSync(typesDir)) {
    fail(
        'there are no shipped declarations to check',
        `expected: ${typesDir}`,
        'Build the library first:  corepack pnpm --filter @anguless/angulux run build',
        'This gate inspects build output, so it cannot run on a source-only checkout.'
    );
}

const declarations = readdirSync(typesDir).filter((f) => f.endsWith('.d.ts'));

if (!declarations.length) {
    fail(
        `${typesDir} exists but contains no .d.ts files`,
        'A directory that matched zero files is the failure this gate is built to refuse.',
        'Rebuild the library and try again.'
    );
}

if (!existsSync(tsc)) {
    fail('typescript is not installed', `expected: ${tsc}`, 'Run: corepack pnpm install');
}

// ---------------------------------------------------------------------------
// 2. The consumer's program: our declarations, their strictest lib setting.
//
//    `paths` reproduces how the package's own subpath exports resolve — dist/<entry>/
//    package.json points `typings` at ../types/anguless-angulux-<entry>.d.ts, and the
//    mapping below is that rule written out. The two more specific patterns come first
//    because TypeScript takes the longest matching prefix.
// ---------------------------------------------------------------------------

const workDir = mkdtempSync(join(tmpdir(), 'angulux-dts-'));
const rel = (p) => join(repoRoot, p);

const baseConfig = {
    compilerOptions: {
        target: 'ES2022',
        lib: ['dom', 'dom.iterable', 'ES2022'],
        module: 'ES2022',
        moduleResolution: 'bundler',
        experimentalDecorators: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        strict: false,
        noEmit: true,
        // The whole point of this file.
        skipLibCheck: false,
        // Absolute, because this config is written to a temp directory and TypeScript 6
        // deprecated `baseUrl` — relative `paths` would resolve against the temp dir.
        paths: {
            '@anguless/angulux': [rel('packages/angulux/dist/types/anguless-angulux.d.ts')],
            '@anguless/angulux/types/*': [rel('packages/angulux/dist/types/anguless-angulux-types-*.d.ts')],
            '@anguless/angulux/icons/*': [rel('packages/angulux/dist/types/anguless-angulux-icons-*.d.ts')],
            '@anguless/angulux/*': [rel('packages/angulux/dist/types/anguless-angulux-*.d.ts')]
        }
    },
    include: [rel('packages/angulux/dist/types/**/*.d.ts')]
};

/** Run tsc over a config and return { ok, output }. Never throws on type errors. */
function typeCheck(config, name) {
    const configPath = join(workDir, `${name}.json`);
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    try {
        execFileSync(process.execPath, [tsc, '-p', configPath], { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' });
        return { ok: true, output: '' };
    } catch (e) {
        return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() };
    }
}

/** How many files the program actually pulled in — reported, so a thin program is visible. */
function programSize() {
    const configPath = join(workDir, 'listing.json');
    writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));

    try {
        const out = execFileSync(process.execPath, [tsc, '-p', configPath, '--listFiles'], {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: 'pipe',
            maxBuffer: 32 * 1024 * 1024
        });
        const files = out.split('\n').filter(Boolean);
        return {
            total: files.length,
            shipped: files.filter((f) => f.includes('/packages/angulux/dist/types/')).length,
            external: files.filter((f) => f.includes('/node_modules/')).length
        };
    } catch {
        return null;
    }
}

try {
    const real = typeCheck(baseConfig, 'shipped');

    if (!real.ok) {
        fail(
            'the SHIPPED declarations do not type-check with skipLibCheck: false',
            'A consumer who turns skipLibCheck off gets these errors in their own build,',
            'while every build in this repository stays green. That is the whole defect class.',
            '',
            ...real.output.split('\n').slice(0, 40)
        );
    }

    // -----------------------------------------------------------------------
    // 3. Self-test. A green result is worthless until the harness is shown rejecting
    //    something. The poison imports through the same `paths` mapping the real files
    //    use, so if resolution were silently broken this would pass and give us away.
    // -----------------------------------------------------------------------

    const poison = join(workDir, 'poison.d.ts');
    writeFileSync(poison, ["import { UIChart } from '@anguless/angulux/chart';", "export declare const nope: UIChart['thisMemberDoesNotExist'];", ''].join('\n'));

    const control = typeCheck({ ...baseConfig, include: [...baseConfig.include, poison] }, 'self-test');

    if (control.ok) {
        fail(
            'the self-test passed, so this gate is not checking anything',
            'A declaration referencing a member that does not exist on UIChart was compiled',
            'by the same program and produced no error. Either the files are not reaching',
            'tsc, or `paths` is resolving to something other than the shipped declarations.',
            'Treat the clean run above as meaningless until this is fixed.'
        );
    }

    if (!/error TS2339/.test(control.output)) {
        fail(
            'the self-test failed for the wrong reason',
            'Expected TS2339 (property does not exist). Got:',
            '',
            ...control.output.split('\n').slice(0, 12),
            '',
            'A harness that fails for an unrelated reason proves nothing about the real run.'
        );
    }

    const size = programSize();
    const scope = size ? `${size.shipped} shipped .d.ts + ${size.external} from node_modules (${size.total} files total)` : `${declarations.length} shipped .d.ts`;

    console.log(`✓ check-dts: ${scope} type-check clean with skipLibCheck: false, and the self-test was rejected as expected.`);
} finally {
    rmSync(workDir, { recursive: true, force: true });
}
