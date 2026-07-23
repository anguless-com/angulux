#!/usr/bin/env node
/**
 * scope-anguless — scopes the five published package names under the org `@anguless/*`.
 *
 *   angulux              -> @anguless/angulux
 *   angulux/<subpath>    -> @anguless/angulux/<subpath>
 *   angulux-utils[/…]    -> @anguless/angulux-utils[/…]
 *   angulux-styled[/…]   -> @anguless/angulux-styled[/…]
 *   angulux-styles[/…]   -> @anguless/angulux-styles[/…]
 *   angulux-motion[/…]   -> @anguless/angulux-motion[/…]
 *
 * WHY A SEPARATE CODEMOD (not rename.mjs): rename.mjs did primeng->angulux + selector p-*->
 * agl-*. This is a different rename — it touches ONLY package identity: import specifiers,
 * package.json name/deps, and tsconfig path-mapping keys. It never touches a selector, a CSS
 * class, a DOM attribute, or any component API.
 *
 * THE TRAP: the string `angulux` also lives in things that must NOT be scoped —
 *   - `angulux-workspace` (the private workspace root, never published)
 *   - CSS classes like `angulux-controls`
 *   - directory paths `packages/angulux/dist`
 *   - the GitHub URL `github.com/anguless-com/angulux`
 * All four are left untouched because the substitution fires ONLY on a QUOTED token whose
 * name is EXACTLY one of the five published names (an explicit allowlist of fork suffixes),
 * immediately followed by `/subpath` or the closing quote. `angulux-workspace`,
 * `angulux-controls`, `packages/angulux/…` and the URL all fail that anchor. (--selftest
 * proves it.)
 *
 * THREE build couplings are NOT this codemod's job — they are string-matching logic elsewhere
 * that must be hand-patched in the same change (see plan B1/B5):
 *   - tools/build/postbuild.mjs      resolveWorkspaceSpec maps a dep NAME to packages/<name>/
 *   - tools/scope/gen-closure.mjs    matches /from ['"](?:primeng|angulux)\// to build closure
 *   - the four tsup.config.ts        external regex on the `angulux-` prefix (a regex literal, not a string)
 * The positional guard (scan-anguless-scope.mjs) is what proves none of these were forgotten —
 * reversibility here proves nothing foreign entered the diff, NOT that the rename is complete.
 *
 * Usage:
 *   node tools/codemod/scope-anguless.mjs            # apply
 *   node tools/codemod/scope-anguless.mjs --dry      # count only, no writes
 *   node tools/codemod/scope-anguless.mjs --verify   # reverse it, diff vs git HEAD (bijection)
 *   node tools/codemod/scope-anguless.mjs --selftest # assert the allowlist include/exclude set
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DRY = process.argv.includes('--dry');
const VERIFY = process.argv.includes('--verify');
const SELFTEST = process.argv.includes('--selftest');
const root = process.cwd();

// A QUOTED token whose name is EXACTLY one of the five published names, then `/subpath` or
// the closing quote. The exact fork-suffix allowlist is what keeps `angulux-workspace` and
// `angulux-controls` out.
const SCOPE = /(['"])(angulux(?:-(?:utils|styled|styles|motion))?)((?:\/[^'"]*)?)\1/g;
const forward = (text) => text.replace(SCOPE, (_, q, name, rest) => `${q}@anguless/${name}${rest}${q}`);

// Exact inverse — only reverses tokens we produced, so the diff can be proven a pure rename.
const UNSCOPE = /(['"])@anguless\/(angulux(?:-(?:utils|styled|styles|motion))?)((?:\/[^'"]*)?)\1/g;
const backward = (text) => text.replace(UNSCOPE, (_, q, name, rest) => `${q}${name}${rest}${q}`);

// ── target set: source .ts (walked) + an EXPLICIT config-file list (never walk *.json blindly:
//    angular.json / nx.json project keys could collide) ──
const SRC_DIRS = ['packages', 'apps/verify'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.angular', 'attic', 'ref', '.git']);

function walkTs(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
            if (SKIP_DIRS.has(e.name)) continue;
            walkTs(path.join(dir, e.name), out);
        } else if (e.name.endsWith('.ts')) out.push(path.join(dir, e.name));
    }
    return out;
}

const CONFIG_FILES = [
    'package.json', // root: name is `angulux-workspace` → regex skips it; deps get scoped
    'tsconfig.json',
    'apps/verify/tsconfig.json',
    'packages/angulux/package.json',
    'packages/angulux/tsconfig.json',
    'packages/angulux/src/package.json',
    'packages/angulux/src/ng-package.json', // allowedNonPeerDependencies: fork names
    ...['utils', 'styled', 'styles', 'motion'].flatMap((n) => [
        `packages/angulux-${n}/package.json`,
        `packages/angulux-${n}/tsconfig.json`,
    ]),
    'tools/check-publishable.mjs',
    'tools/check-catalog.mjs',
];

const files = [...new Set([...SRC_DIRS.flatMap((d) => walkTs(d)), ...CONFIG_FILES.filter((f) => fs.existsSync(f))])];

if (SELFTEST) {
    const include = {
        "'angulux'": "'@anguless/angulux'",
        "'angulux/api'": "'@anguless/angulux/api'",
        "'angulux-utils'": "'@anguless/angulux-utils'",
        '"angulux-styles/x/y"': '"@anguless/angulux-styles/x/y"',
    };
    const exclude = ['"angulux-workspace"', '"angulux-controls"', "'packages/angulux/dist'", '"https://github.com/anguless-com/angulux"'];
    let fail = 0;
    for (const [inp, want] of Object.entries(include)) {
        const got = forward(inp);
        if (got !== want) { console.error(`  ✗ include ${inp} → ${got} (want ${want})`); fail++; }
    }
    for (const inp of exclude) {
        const got = forward(inp);
        if (got !== inp) { console.error(`  ✗ exclude ${inp} was CHANGED to ${got}`); fail++; }
    }
    // idempotence: running twice must be a no-op
    if (forward(forward("'angulux/api'")) !== "'@anguless/angulux/api'") { console.error('  ✗ not idempotent'); fail++; }
    // bijection round-trip
    if (backward(forward("'angulux-motion/x'")) !== "'angulux-motion/x'") { console.error('  ✗ round-trip broken'); fail++; }
    if (fail) { console.error(`\n✗ selftest: ${fail} case(s) failed`); process.exit(1); }
    console.log('✓ selftest: allowlist includes the 5 names, excludes workspace/CSS/dir/URL, idempotent, bijective.');
    process.exit(0);
}

if (VERIFY) {
    let mismatch = 0, checked = 0;
    for (const f of files) {
        const now = fs.readFileSync(f, 'utf8');
        let orig;
        try { orig = execSync(`git show HEAD:${f}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
        catch { continue; }
        checked++;
        if (backward(now) !== orig) {
            mismatch++;
            if (mismatch <= 5) console.error(`  ✗ ${f} — reversing does NOT reproduce the original`);
        }
    }
    console.log(`\n  compared ${checked} file(s), ${mismatch} mismatched`);
    if (mismatch) { console.error('\n✗ The diff is NOT a pure scope rename — something else got mixed in.'); process.exit(1); }
    console.log('✓ Every file reverses to its exact original ⇒ the diff is a PURE scope rename.');
    process.exit(0);
}

let changed = 0, untouched = 0, totalSubs = 0;
const perName = {};
for (const f of files) {
    const before = fs.readFileSync(f, 'utf8');
    for (const m of before.matchAll(SCOPE)) perName[m[2]] = (perName[m[2]] || 0) + 1, totalSubs++;
    const after = forward(before);
    if (before !== after) { changed++; if (!DRY) fs.writeFileSync(f, after); }
    else untouched++;
}
console.log(`  file scanned    : ${files.length}`);
console.log(`  file changed    : ${changed}`);
console.log(`  file untouched  : ${untouched}`);
console.log(`  substitutions   : ${totalSubs}`);
for (const [n, c] of Object.entries(perName).sort((a, b) => b[1] - a[1])) console.log(`      ${n.padEnd(16)} ${c}`);
if (DRY) console.log('  (--dry: nothing written)');
