#!/usr/bin/env node
/**
 * check-prime-license — fails the build if a commercially licensed PrimeTek package
 * reaches the dependency tree.
 *
 * PrimeTek moved PrimeNG, PrimeVue and PrimeReact to the commercial "PrimeUI" license
 * starting from specific majors. This reads the lockfile and fails if any prime* package
 * resolves to a version at or above that boundary.
 *
 * This is the guard behind the project's core claim. "We are MIT" is a promise; a build
 * that refuses to complete when a commercial package appears is a proof.
 *
 * Usage:  node tools/check-prime-license.mjs [path/to/project]
 * Wiring: add it to the package's "prebuild" script.
 *
 * No third-party dependencies. Exits 1 on any violation.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * The first major of each package that carries the commercial PrimeUI license.
 * Any version >= the boundary is NOT MIT.
 * Sources: primeui.dev/nextchapter, cross-checked against the LICENSE file inside each
 * published npm tarball (2026-07-23). Update this table whenever PrimeTek ships a new
 * major of any prime* package.
 */
const FIRST_COMMERCIAL = {
  primeng: '22.0.0',
  primevue: '5.0.0',
  primereact: '11.0.0',
  primeicons: '8.0.0',
  '@primeuix/utils': '0.8.0',
  '@primeuix/styled': '1.0.0',
  '@primeuix/styles': '3.0.0',
  '@primeuix/themes': '3.0.0',
  '@primeuix/motion': '1.0.0',
};

/** Packages that are commercial in every version — no MIT release exists. */
const ALWAYS_COMMERCIAL = ['@primeui/license-manager', '@primeicons/angular'];

const cmp = (a, b) => {
  const pa = a.split('-')[0].split('.').map(Number);
  const pb = b.split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
};

const root = resolve(process.argv[2] ?? process.cwd());
const npmLock = join(root, 'package-lock.json');
const pnpmLock = join(root, 'pnpm-lock.yaml');

if (!existsSync(npmLock) && !existsSync(pnpmLock)) {
  console.error(`✗ No package-lock.json or pnpm-lock.yaml found at ${root}`);
  console.error('  The lockfile is a legal artifact here — it must be committed.');
  process.exit(1);
}

/**
 * Returns [{name, version}] from the lockfile, for both npm and pnpm.
 * pnpm-lock.yaml is not JSON, but all that is needed are the `/name@version` and
 * `name@version:` keys under `packages:` / `snapshots:` — enough to know which versions
 * the tree really contains, without pulling in a YAML parser.
 *
 * Returns `version: null` for entries that are NOT semver (tarball URL, git ref, file:).
 * The caller handles those separately: being unable to compare a version is not the same
 * as being safe. It is, in fact, the easiest way to slip a commercial build past a guard
 * that only knows how to read numbers.
 */
function readLock() {
  const out = [];
  if (existsSync(npmLock)) {
    const lock = JSON.parse(readFileSync(npmLock, 'utf8'));
    for (const [p, meta] of Object.entries(lock.packages ?? {})) {
      if (!p.startsWith('node_modules/') || !meta.version) continue;
      out.push({ name: p.slice(p.lastIndexOf('node_modules/') + 'node_modules/'.length), version: meta.version });
    }
  }
  if (existsSync(pnpmLock)) {
    const text = readFileSync(pnpmLock, 'utf8');
    const seenKey = new Set();
    // Match EVERY `name@<spec>:` key, not just semver-shaped ones — the spec is classified
    // afterwards. e.g.  '/primeng@21.1.9:'  ·  "  primeng@21.1.9:"  ·  "  '@primeuix/utils@0.7.2':"
    //                   "  primeng@https://…/primeng-22.0.0.tgz:"  ·  "  primeng@github:primefaces/primeng#sha:"
    const rx = /^\s{2,}'?\/?((?:@[^/\s'"]+\/)?[^@/\s'"]+)@([^\s'"]+?)'?:\s*$/gm;
    for (const m of text.matchAll(rx)) {
      const key = `${m[1]}@${m[2]}`;
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      // Strip pnpm's peer-deps suffix: `primeng@21.1.9(@angular/core@22.0.8)`
      const spec = m[2].split('(')[0];
      out.push({ name: m[1], version: /^\d+\.\d+\.\d+/.test(spec) ? spec : null, raw: m[2] });
    }
  }
  return out;
}

const violations = [];
const seen = [];

for (const { name, version, raw } of readLock()) {

  if (ALWAYS_COMMERCIAL.includes(name)) {
    violations.push({ name, version: version ?? raw, reason: 'commercial in every version' });
    continue;
  }
  const floor = FIRST_COMMERCIAL[name];
  if (!floor) continue;

  // Unreadable version → do NOT assume it is safe. Installing from a tarball URL, a git
  // ref or file: is precisely how a commercial build enters the tree unseen by a guard
  // that only reads numbers. Fail here and make a human confirm it by eye.
  if (version === null) {
    violations.push({
      name,
      version: raw,
      reason: 'not a semver version — the license cannot be verified automatically'
    });
    continue;
  }

  seen.push({ name, version });
  if (cmp(version, floor) >= 0) {
    violations.push({ name, version, reason: `>= ${floor} is the commercial PrimeUI license` });
  }
}

if (violations.length) {
  console.error('\n✗ COMMERCIALLY LICENSED PRIMETEK PACKAGE DETECTED\n');
  for (const v of violations) {
    console.error(`   ${v.name}@${v.version}`);
    console.error(`      → ${v.reason}`);
  }
  console.error('\n  These versions are NOT MIT. Using them requires a PrimeUI license.');
  console.error('  See primeui.dev/nextchapter and PROVENANCE.md.\n');
  console.error('  Fix: downgrade to the last MIT release and pin it exactly (drop the ^).\n');
  process.exit(1);
}

if (!seen.length) {
  console.log('✓ prime-license: no PrimeTek dependency in the tree.');
} else {
  console.log(`✓ prime-license: ${seen.length} PrimeTek package(s), all on MIT releases.`);
  for (const s of seen.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`    ${s.name}@${s.version}`);
  }
}
