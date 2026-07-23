#!/usr/bin/env node
/**
 * check-catalog — enforces version discipline in pnpm-workspace.yaml.
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

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const wsPath = join(root, 'pnpm-workspace.yaml');

const fail = [];
const ok = [];

if (!existsSync(wsPath)) {
  console.error('✗ No pnpm-workspace.yaml found — the workspace is not set up.');
  process.exit(1);
}

/** Minimal parser, just enough for the catalog shape (avoids a YAML dependency). */
function parseWorkspace(text) {
  const out = { packages: [], catalog: {}, catalogs: {} };
  const lines = text.split('\n');
  let section = null;
  let subCatalog = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();

    if (indent === 0) {
      section = line.replace(/:$/, '');
      subCatalog = null;
      continue;
    }
    if (section === 'packages') {
      const m = line.match(/^-\s*['"]?(.+?)['"]?$/);
      if (m) out.packages.push(m[1]);
      continue;
    }
    if (section === 'catalog') {
      const m = line.match(/^['"]?([^'":]+)['"]?\s*:\s*['"]?([^'"]+)['"]?$/);
      if (m) out.catalog[m[1]] = m[2].trim();
      continue;
    }
    if (section === 'catalogs') {
      if (line.endsWith(':') && indent <= 4) {
        subCatalog = line.replace(/:$/, '');
        out.catalogs[subCatalog] = {};
        continue;
      }
      const m = line.match(/^['"]?([^'":]+)['"]?\s*:\s*['"]?([^'"]+)['"]?$/);
      if (m && subCatalog) out.catalogs[subCatalog][m[1]] = m[2].trim();
    }
  }
  return out;
}

const ws = parseWorkspace(readFileSync(wsPath, 'utf8'));
const isExact = (v) => /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v);
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
const FORKED = ['angulux-utils', 'angulux-styled', 'angulux-styles', 'angulux-motion'];
const libPkgPath = join(root, 'packages/angulux/package.json');
const libDeps = existsSync(libPkgPath) ? (JSON.parse(readFileSync(libPkgPath, 'utf8')).dependencies ?? {}) : {};
for (const p of FORKED) {
  if (!existsSync(join(root, 'packages', p, 'package.json'))) {
    fail.push(`forked package "packages/${p}" is missing — the library would fall back to a PrimeTek dependency`);
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
}

for (const o of ok) console.log(`  ✓ ${o}`);
if (fail.length) {
  console.error('\n✗ check-catalog FAILED:\n');
  for (const f of fail) console.error(`   • ${f}`);
  console.error('');
  process.exit(1);
}
console.log('\n✓ check-catalog: workspace version discipline holds.');
