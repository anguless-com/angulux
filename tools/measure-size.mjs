#!/usr/bin/env node
// What each entry point of @anguless/angulux costs an application: minified, gzip and brotli
// bytes, with the part that is the module's own code told apart from what it drags in.
// See tools/lib/size-measure.mjs for why the files are linked and optimised before bundling.
//
//   node tools/measure-size.mjs                  the table
//   node tools/measure-size.mjs --json out.json  the same numbers, for a diff
//   node tools/measure-size.mjs --top 30         how many rows of the table to print
//   node tools/measure-size.mjs --why button     the files inside one entry point's bundle
//   node tools/measure-size.mjs --check          compare with tools/size-baseline.json (CI)
//   node tools/measure-size.mjs --prune          lower the baseline to what was measured
//
// Needs the built packages (`packages/*/dist`). Without --check it measures and does not
// judge. With it: exit 0 when every entry point sits within its allowance of the baseline,
// 1 when one grew past it — or shrank past it and the baseline was not lowered to match.
// Exit 2 always means it could not measure — no build, no entry points, a bundle that failed,
// an unreadable baseline — and never "nothing to report".

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allowance, attribute, compressed, DEFINE, entryPoints, EXTERNAL, family, heaviestInputs, judge, kb, pruneBaseline, sharedInputs } from './lib/size-measure.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = join(ROOT, 'packages/angulux');
const DIST = join(LIB, 'dist');
const BASELINE = join(ROOT, 'tools/size-baseline.json');

function fail(message) {
    console.error(`measure-size: ${message}`);
    process.exit(2);
}

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const jsonOut = flag('--json');
const top = Number(flag('--top') ?? 25);
const why = flag('--why');

if (!existsSync(join(DIST, 'package.json'))) fail(`no build at ${relative(ROOT, DIST)} — build the packages first (see the "Build" job in .github/workflows/ci.yml)`);

const manifest = JSON.parse(readFileSync(join(DIST, 'package.json'), 'utf8'));
const entries = entryPoints(manifest);
if (entries.length === 0) fail('the built package.json exports no JavaScript entry point');

// Both are the root's own devDependencies, and esbuild is pinned to the very version
// @angular/build bundles applications with. The transformer is a PRIVATE export of
// @angular/build: an upgrade that drops it fails here, loudly, rather than measuring
// something else under the same name.
const esbuild = await import('esbuild');
const appRequire = createRequire(join(ROOT, 'package.json'));
let JavaScriptTransformer;
try {
    ({ JavaScriptTransformer } = appRequire('@angular/build/private'));
} catch (error) {
    fail(`@angular/build/private did not load: ${error.message}`);
}
if (typeof JavaScriptTransformer !== 'function') fail('@angular/build/private no longer exports JavaScriptTransformer');

const transformer = new JavaScriptTransformer({ sourcemap: false, advancedOptimizations: true, jit: false });
const transformed = new Map();
const byKey = new Map(entries.map((e) => [e.key, join(DIST, e.file)]));

/** Self-references resolve through the built `exports`; every file gets the app builder's passes. */
const plugin = {
    name: 'angulux-as-an-app-sees-it',
    setup(build) {
        build.onResolve({ filter: /^@anguless\/angulux(\/.*)?$/ }, (a) => {
            const key = a.path === '@anguless/angulux' ? '.' : `.${a.path.slice('@anguless/angulux'.length)}`;
            const file = byKey.get(key);
            return file ? { path: file } : { errors: [{ text: `${a.path} is not an entry point of the built package` }] };
        });
        build.onLoad({ filter: /\.m?js$/ }, async (a) => {
            if (!transformed.has(a.path)) transformed.set(a.path, transformer.transformFile(a.path, { sideEffects: async () => false }));
            return { contents: await transformed.get(a.path), loader: 'js' };
        });
    }
};

async function bundle(source) {
    const result = await esbuild.build({
        stdin: { contents: source, resolveDir: LIB, loader: 'js' },
        bundle: true,
        minify: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2022',
        treeShaking: true,
        write: false,
        metafile: true,
        legalComments: 'none',
        logLevel: 'silent',
        pure: ['forwardRef'],
        define: DEFINE,
        external: EXTERNAL,
        // Without this esbuild reads packages/angulux/tsconfig.json and follows its `paths` into
        // the SOURCES of the forked packages — measuring a build no consumer ever receives.
        tsconfigRaw: '{}',
        plugins: [plugin]
    });
    const [output] = Object.values(result.metafile.outputs);
    const inputs = Object.fromEntries(
        Object.entries(output.inputs)
            .filter(([, v]) => v.bytesInOutput > 0)
            .map(([path, v]) => [path, v.bytesInOutput])
    );
    const externals = [...new Set(output.imports.filter((i) => i.external).map((i) => i.path))].sort();
    return { ...compressed(result.outputFiles[0].contents), inputs, rawInputs: output.inputs, externals };
}

const rows = [];
try {
    for (const entry of entries) {
        const spec = entry.key === '.' ? '@anguless/angulux' : `@anguless/angulux/${entry.name}`;
        const b = await bundle(`export * from ${JSON.stringify(spec)};`);
        rows.push({
            name: entry.name,
            family: family(entry.name),
            min: b.min,
            gzip: b.gzip,
            brotli: b.brotli,
            parts: attribute(b.rawInputs, entry.file),
            files: Object.keys(b.inputs).length,
            externals: b.externals,
            inputs: b.inputs
        });
    }
} catch (error) {
    await transformer.close();
    fail(`a bundle failed: ${error.message}`);
}

const components = rows.filter((r) => r.family === 'components' && r.name !== '(root)');
if (components.length === 0) {
    await transformer.close();
    fail('no component entry point was measured');
}

// Every component at once: what an application that uses the whole library pays, and — set
// against the sum of the rows — how much of each row is shared with the others.
const everything = await bundle(components.map((r) => `export * from ${JSON.stringify(`@anguless/angulux/${r.name}`)};`).join('\n'));
await transformer.close();

// The floor: what every entry point built on BaseComponent has in common. The handful that
// are not components at all (`api`, `utils`, `bind`…) would make the intersection empty.
const onBase = components.filter((r) => Object.keys(r.inputs).some((p) => p.endsWith('anguless-angulux-basecomponent.mjs')));
const shared = sharedInputs(onBase.map((r) => r.inputs));
const sharedBytes = Object.values(shared).reduce((a, b) => a + b, 0);
const heaviest = heaviestInputs(components.map((r) => r.inputs), 25).map((h) => ({ ...h, path: h.path }));

const report = {
    tool: { esbuild: esbuild.version, angularBuild: appRequire('@angular/build/package.json').version, node: process.version },
    library: manifest.version,
    external: EXTERNAL,
    everything: { min: everything.min, gzip: everything.gzip, brotli: everything.brotli, files: Object.keys(everything.inputs).length },
    sharedByEveryComponent: { min: sharedBytes, files: Object.keys(shared).sort(), entryPoints: onBase.length },
    heaviestFiles: heaviest,
    entryPoints: Object.fromEntries(rows.map(({ inputs, ...r }) => [r.name, r]))
};

if (jsonOut) writeFileSync(resolve(jsonOut), `${JSON.stringify(report, null, 4)}\n`);

if (args.includes('--check') || args.includes('--prune')) {
    // `(all components)` is the library taken whole: sharing between modules can get worse
    // while every single row stays inside its allowance, and only this number shows it.
    const found = Object.fromEntries(rows.filter((r) => r.min > 0).map((r) => [r.name, r.min]));
    found['(all components)'] = everything.min;

    let file = { entryPoints: {} };
    if (existsSync(BASELINE)) {
        try {
            file = JSON.parse(readFileSync(BASELINE, 'utf8'));
        } catch (error) {
            fail(`${relative(ROOT, BASELINE)} is not valid JSON: ${error.message}`);
        }
        if (typeof file.entryPoints !== 'object' || file.entryPoints === null) fail(`${relative(ROOT, BASELINE)} has no "entryPoints"`);
    } else if (!args.includes('--prune')) fail(`${relative(ROOT, BASELINE)} is missing`);

    if (args.includes('--prune')) {
        const next = pruneBaseline(file.entryPoints, found);
        writeFileSync(BASELINE, `${JSON.stringify({ ...file, entryPoints: next }, null, 4)}\n`);
        const still = judge(next, found).grew;
        console.log(`measure-size: baseline written — ${Object.keys(next).length} entry points, ${Object.values(next).reduce((a, b) => a + b, 0)} bytes in all`);
        if (still.length) {
            console.error(`measure-size: ${still.length} entry point(s) are still over the baseline; pruning never raises a number`);
            for (const g of still) console.error(`  ${g.name}: ${g.found} bytes, baseline ${g.baseline} (+${g.found - g.baseline}, allowance ${g.slack})`);
            process.exit(1);
        }
        process.exit(0);
    }

    const verdict = judge(file.entryPoints, found);
    for (const g of verdict.grew) console.error(`grew       ${g.name}: ${g.found} bytes, baseline ${g.baseline} (+${g.found - g.baseline}, allowance ${g.slack}) — node tools/measure-size.mjs --why ${g.name}`);
    for (const a of verdict.added) console.error(`new        ${a.name}: ${a.found} bytes, not in the baseline`);
    for (const s of verdict.shrank) console.error(`shrank     ${s.name}: ${s.found} bytes, baseline ${s.baseline} (−${s.baseline - s.found}, allowance ${s.slack})`);
    for (const r of verdict.removed) console.error(`gone       ${r.name}: in the baseline, no longer an entry point`);
    const stale = verdict.added.length + verdict.shrank.length + verdict.removed.length;
    if (verdict.grew.length) console.error(`\nmeasure-size: ${verdict.grew.length} entry point(s) grew past their allowance. Make the change smaller, or — if the growth is the point — raise the number in ${relative(ROOT, BASELINE)} by hand and say why in the pull request.`);
    if (stale) console.error(`\nmeasure-size: the baseline is stale in ${stale} place(s). Lower it to match: node tools/measure-size.mjs --prune`);
    if (verdict.grew.length || stale) process.exit(1);
    console.log(`measure-size: ${Object.keys(found).length} entry points measured, each within its allowance of the baseline (1 %, at least ${allowance(0)} bytes)`);
    process.exit(0);
}

if (why) {
    const row = rows.find((r) => r.name === why);
    if (!row) fail(`--why ${why}: not an entry point`);
    console.log(`${why}: min ${kb(row.min)} kB, gzip ${kb(row.gzip)} kB, ${row.files} files`);
    for (const [path, bytes] of Object.entries(row.inputs).sort((a, b) => b[1] - a[1])) console.log(`${kb(bytes)}  ${path}`);
    process.exit(0);
}

const sorted = [...components].sort((a, b) => b.gzip - a.gzip);
const part = (r, k) => kb(r.parts[k] ?? 0);
console.log(`@anguless/angulux ${manifest.version} — ${components.length} component entry points, kB (1024)`);
console.log(`esbuild ${esbuild.version}, @angular/build ${report.tool.angularBuild}, external: ${EXTERNAL.join(' ')}\n`);
console.log(`${'entry point'.padEnd(20)} ${'min'.padStart(7)} ${'gzip'.padStart(7)} ${'brotli'.padStart(7)} | ${'own'.padStart(7)} ${'library'.padStart(7)} ${'styles'.padStart(7)} ${'styled'.padStart(7)} ${'utils'.padStart(7)} ${'motion'.padStart(7)}`);
for (const r of sorted.slice(0, top)) {
    console.log(`${r.name.padEnd(20)} ${kb(r.min)} ${kb(r.gzip)} ${kb(r.brotli)} | ${part(r, 'own')} ${part(r, 'library')} ${part(r, 'styles')} ${part(r, 'styled')} ${part(r, 'utils')} ${part(r, 'motion')}`);
}
if (sorted.length > top) console.log(`… ${sorted.length - top} more (--top ${sorted.length} for all)`);

const sum = components.reduce((a, r) => a + r.gzip, 0);
console.log(`\nevery component together   min ${kb(everything.min)}  gzip ${kb(everything.gzip)}  brotli ${kb(everything.brotli)}   (the rows add up to gzip ${kb(sum)})`);
console.log(`shared by all ${onBase.length} built on BaseComponent: min ${kb(sharedBytes)} in ${Object.keys(shared).length} files — the floor of a first component`);
console.log('\nheaviest files (minified bytes in a bundle, and how many component entry points pull each in)');
for (const h of heaviest.slice(0, 15)) console.log(`${kb(h.bytes)}  ×${String(h.usedBy).padStart(3)}  ${h.path}`);
