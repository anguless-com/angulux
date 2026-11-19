#!/usr/bin/env node
/**
 * check-catalog — enforces version discipline in pnpm-workspace.yaml, in every workspace
 * package manifest, and in the root manifest's overrides.
 *
 * Everything that gets INSTALLED (dependencies/devDependencies) must be pinned exactly,
 * because that is the license risk surface: one careless `npm update` is all it takes to
 * pull in a commercially licensed package.
 *
 * peerDependencies are NOT installed — they declare compatibility. Pinning a peer range
 * exactly would break every consumer who moves to Angular 22.1, so the peer-bound group
 * MUST be a range. Two opposite rules, one file, which is exactly why a machine checks it.
 *
 * Run: node tools/check-catalog.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseWorkspace } from './workspace-catalog.mjs';
import { isExact, judgeManifest, judgeOverrides } from './lib/manifest-pins.mjs';

const root = process.cwd();
const wsPath = join(root, 'pnpm-workspace.yaml');

const fail = [];
const ok = [];

if (!existsSync(wsPath)) {
  console.error('✗ No pnpm-workspace.yaml found — the workspace is not set up.');
  process.exit(1);
}

const ws = parseWorkspace(readFileSync(wsPath, 'utf8'));
const isRange = (v) => /^[\^~]|\|\||\s-\s|^[<>]/.test(v);

// ---- 1. packages globs ----
for (const need of ['packages/*', 'apps/*']) {
  if (ws.packages.includes(need)) ok.push(`packages glob "${need}"`);
  else fail.push(`pnpm-workspace.yaml is missing the packages glob "${need}"`);
}

// ---- 2. the default catalog = EXTERNAL dependencies → must be pinned EXACTLY ----
/* The four `@primeuix/*` packages used to live here. They have been FORKED into the
   workspace as `angulux-{utils,styled,styles,motion}`, so they are workspace members now
   rather than external dependencies — outside the license risk surface this catalog
   guards, and listing them here would make pnpm look them up on the registry instead of
   linking them locally. Section 2b guards the new invariant instead: they must EXIST in
   the workspace, and the library must reference them through the `workspace:` protocol
   rather than a registry version. */
if (Object.keys(ws.catalog).length === 0) fail.push('the default catalog is empty — no runtime dependency declared');
for (const [p, v] of Object.entries(ws.catalog)) {
  if (!isExact(v)) fail.push(`default catalog "${p}: ${v}" must be pinned EXACTLY — no ^ and no ~`);
  else ok.push(`${p} pinned exactly at ${v}`);
}

// ---- 2b. the forked family must live IN the workspace and be referenced by workspace: ----
// The dep is keyed by its published (scoped) name; the workspace directory stays unscoped.
const FORKED = ['@anguless/angulux-utils', '@anguless/angulux-styled', '@anguless/angulux-styles', '@anguless/angulux-motion'];
const dirOf = (name) => name.replace(/^@anguless\//, '');
const libPkgPath = join(root, 'packages/angulux/package.json');
const libDeps = existsSync(libPkgPath) ? (JSON.parse(readFileSync(libPkgPath, 'utf8')).dependencies ?? {}) : {};
for (const p of FORKED) {
  const dir = dirOf(p);
  if (!existsSync(join(root, 'packages', dir, 'package.json'))) {
    fail.push(`forked package "packages/${dir}" is missing — the library would fall back to a PrimeTek dependency`);
    continue;
  }
  const spec = libDeps[p];
  if (!spec) fail.push(`packages/angulux/package.json is missing the dependency "${p}"`);
  else if (!spec.startsWith('workspace:')) fail.push(`"${p}: ${spec}" must use the workspace: protocol (it currently points at the registry)`);
  else ok.push(`${p} is a workspace package, referenced as ${spec}`);
}
for (const [p, v] of Object.entries(libDeps)) {
  if (/^@primeuix\//.test(p)) fail.push(`packages/angulux still depends on PrimeTek: "${p}: ${v}" — removing this group is the whole point of the fork`);
}

// ---- 3. catalog angular22 ----
const ng = ws.catalogs.angular22;
if (!ng) {
  fail.push('catalogs.angular22 is missing');
} else {
  // 3a. the group that flows into peerDependencies → MUST be a range
  const PEER_BOUND = ['@angular/core', '@angular/common', '@angular/forms', '@angular/router', '@angular/platform-browser'];
  for (const p of PEER_BOUND) {
    const v = ng[p];
    if (!v) fail.push(`catalogs.angular22 is missing "${p}"`);
    else if (!isRange(v)) fail.push(`"${p}: ${v}" is peer-bound → MUST be a range; pinning it breaks consumers on Angular 22.1+`);
    else if (!v.includes('22')) fail.push(`"${p}: ${v}" must include Angular 22`);
    else ok.push(`${p} range ${v} (peer-bound, correct)`);
  }
  // 3b. dev-only tooling → pinned EXACTLY so the build is reproducible
  const DEV_EXACT = ['typescript', 'ng-packagr'];
  for (const p of DEV_EXACT) {
    const v = ng[p];
    if (!v) fail.push(`catalogs.angular22 is missing "${p}"`);
    else if (!isExact(v)) fail.push(`"${p}: ${v}" is dev tooling → must be pinned EXACTLY for a reproducible build`);
    else ok.push(`${p} pinned exactly at ${v}`);
  }
  // 3c. TypeScript MUST stay on 6.0.x — Angular 22 requires ">=6.0 <6.1"; ts@latest is 7.x
  const ts = ng.typescript;
  if (ts && !/^6\.0\./.test(ts)) {
    fail.push(`typescript "${ts}" is outside the range Angular 22 requires (">=6.0 <6.1"). ts@latest is 7.x — the build would break.`);
  } else if (ts) ok.push(`typescript ${ts} is inside the range Angular 22 requires`);
  // 3d. @angular/cdk must NOT be present
  if (ng['@angular/cdk']) fail.push('catalogs.angular22 still lists "@angular/cdk" — it was dropped on purpose');
  else ok.push('no @angular/cdk');
  // 3e. everything else in this catalog is installed tooling → EXACT. Only the framework
  // packages that have to resolve in lockstep with the peer-bound core range may be ranges.
  const MAY_RANGE = new Set([...PEER_BOUND, '@angular/animations', '@angular/compiler']);
  let exactOthers = 0;
  for (const [p, v] of Object.entries(ng)) {
    if (MAY_RANGE.has(p) || DEV_EXACT.includes(p)) continue;
    if (!isExact(v)) fail.push(`catalogs.angular22 "${p}: ${v}" is installed tooling → must be pinned EXACTLY; only the Angular framework packages may be ranges`);
    else exactOthers++;
  }
  ok.push(`${exactOthers} other angular22 entries pinned exactly`);
}

// ---- 4. every workspace manifest: what gets installed is exact, a catalog entry, or a workspace member ----
// Sections 2 and 3 judge the catalog. A manifest that never mentions the catalog was outside
// them, so a literal `^1.2.3` in a package.json passed this gate untouched. See
// tools/lib/manifest-pins.mjs for the rule and why peerDependencies are exempt.
const manifests = ['package.json'];
for (const glob of ws.packages) {
  const base = glob.replace(/\/\*$/, '');
  if (base === glob) {
    fail.push(`packages glob "${glob}" is not of the form "<dir>/*" — this gate cannot enumerate it, so its manifests would go unread`);
    continue;
  }
  const dir = join(root, base);
  const found = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'package.json')))
        .map((d) => `${base}/${d.name}/package.json`)
        .sort()
    : [];
  if (!found.length) fail.push(`packages glob "${glob}" matches no package manifest — nothing under it was examined`);
  manifests.push(...found);
}

let specifiers = 0;
let clean = 0;
for (const rel of manifests) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (e) {
    fail.push(`${rel} could not be read as JSON: ${e.message}`);
    continue;
  }
  const { problems, examined } = judgeManifest(rel, manifest, ws);
  specifiers += examined;
  if (problems.length) fail.push(...problems);
  else clean++;

  if (rel === 'package.json') {
    const forced = judgeOverrides(rel, manifest);
    if (forced.problems.length) fail.push(...forced.problems);
    else ok.push(`${forced.examined} forced version(s) in pnpm.overrides / resolutions, all exact`);
  }
}
if (specifiers === 0) fail.push('no installed dependency was found in any workspace manifest — the manifest check examined nothing');
else ok.push(`${clean} of ${manifests.length} manifests clean: ${specifiers} installed specifiers, each exact, a catalog entry or a workspace member`);

for (const o of ok) console.log(`  ✓ ${o}`);
if (fail.length) {
  console.error('\n✗ check-catalog FAILED:\n');
  for (const f of fail) console.error(`   • ${f}`);
  console.error('');
  process.exit(1);
}
console.log('\n✓ check-catalog: workspace version discipline holds.');
