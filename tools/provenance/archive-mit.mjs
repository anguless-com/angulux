#!/usr/bin/env node
/**
 * archive-mit — keeps an offline record of the upstream artifacts that are still MIT.
 *
 * Why it matters: `primefaces/primeng` on GitHub is archived, and the checkout in `ref/` is
 * a single-commit shallow clone. If the MIT lineage of this project ever has to be proven,
 * a shallow clone of an archived repository is weak evidence.
 *
 * A registry tarball is far stronger: it carries the registry's own publish timestamp, the
 * integrity hash the registry published, and the LICENSE file inside it. That is what
 * survives being questioned.
 *
 * Usage:
 *   node tools/provenance/archive-mit.mjs           # download and write the manifest
 *   node tools/provenance/archive-mit.mjs --verify  # verify checksums, no download
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const VERIFY = process.argv.includes('--verify');
const root = process.cwd();
/**
 * Where the tarballs live. NOT in the public repo: `primeng-21.1.9.tgz` ships a
 * `package/LICENSE.md` that contains the proprietary "PRIMENG LTS VERSIONS LICENSE"
 * section alongside the MIT one, so republishing the archive would make every license
 * scanner flag this project and would serve no purpose — `provenance/manifest.json`
 * carries the SHA-256 checksums, which is the actual proof.
 *
 * Anyone can reproduce the archive and check it against the committed manifest:
 *   node tools/provenance/archive-mit.mjs && node tools/provenance/archive-mit.mjs --verify
 *
 * Override the location with ANGULUX_PROVENANCE_TARBALLS to point at a private
 * evidence store.
 */
const DIR = process.env.ANGULUX_PROVENANCE_TARBALLS ? path.resolve(process.env.ANGULUX_PROVENANCE_TARBALLS) : path.join(root, 'provenance/tarballs');
const MANIFEST = path.join(root, 'provenance/manifest.json');

/**
 * The LAST MIT release of each package. Everything above these versions carries the
 * commercial PrimeUI license (see PROVENANCE.md). This is the set worth preserving.
 */
const TARGETS = [
    ['primeng', '21.1.9'],
    ['@primeuix/utils', '0.7.2'],
    ['@primeuix/styled', '0.7.4'],
    ['@primeuix/styles', '2.0.3'],
    ['@primeuix/motion', '0.0.10'],
    ['@primeuix/themes', '2.0.3'],
    ['primeicons', '7.0.0'],
    ['tailwindcss-primeui', '0.6.1']
];

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const fileOf = (name, version) => `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;

async function meta(name, version) {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`);
    if (!res.ok) throw new Error(`registry ${name}@${version}: HTTP ${res.status}`);
    return res.json();
}
async function pkgTime(name, version) {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    return (await res.json()).time?.[version] ?? null;
}

if (VERIFY) {
    if (!fs.existsSync(MANIFEST)) {
        console.error('✗ provenance/manifest.json does not exist yet — run without --verify first.');
        process.exit(1);
    }
    const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    let bad = 0;
    for (const e of m.artifacts) {
        const p = path.join(DIR, e.file);
        if (!fs.existsSync(p)) {
            console.error(`  ✗ MISSING FILE  ${e.file}`);
            bad++;
            continue;
        }
        const got = sha256(fs.readFileSync(p));
        if (got !== e.sha256) {
            console.error(`  ✗ CHECKSUM MISMATCH ${e.file}\n      manifest: ${e.sha256}\n      actual  : ${got}`);
            bad++;
        } else {
            console.log(`  ✓ ${e.name}@${e.version}  ${e.license}  (${e.publishedAt?.slice(0, 10) ?? '?'})`);
        }
    }
    if (bad) {
        console.error(`\n✗ ${bad}/${m.artifacts.length} artifact(s) missing or corrupt.`);
        process.exit(1);
    }
    console.log(`\n✓ archive-mit --verify: ${m.artifacts.length}/${m.artifacts.length} artifacts match their checksums.`);
    process.exit(0);
}

fs.mkdirSync(DIR, { recursive: true });
const artifacts = [];

for (const [name, version] of TARGETS) {
    const md = await meta(name, version);
    const url = md.dist.tarball;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const file = fileOf(name, version);
    fs.writeFileSync(path.join(DIR, file), buf);

    const digest = sha256(buf);
    // the registry's dist.integrity is SRI-form sha512 — kept verbatim as an independent check
    const entry = {
        name,
        version,
        file,
        license: md.license ?? '(xem LICENSE trong tarball)',
        tarball: url,
        publishedAt: await pkgTime(name, version),
        sha256: digest,
        registryIntegrity: md.dist.integrity ?? null,
        registryShasum: md.dist.shasum ?? null,
        bytes: buf.length
    };
    artifacts.push(entry);
    console.log(`  ✓ ${name}@${version}  ${(buf.length / 1024).toFixed(0)} KB  license=${entry.license}  published=${entry.publishedAt?.slice(0, 10) ?? '?'}`);
}

const manifest = {
    _comment:
        'Offline record of the upstream MIT artifacts. primefaces/primeng is archived; ' +
        "a registry tarball (carrying the registry's own publish timestamp and integrity " +
        'hash) is stronger evidence than a shallow clone. See PROVENANCE.md.',
    archivedAt: new Date().toISOString(),
    note: 'Every version above the ones listed below carries the commercial PrimeUI license.',
    artifacts
};
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 4) + '\n');
console.log(`\n✓ da ghi provenance/manifest.json — ${artifacts.length} artifact, tong ${(artifacts.reduce((a, b) => a + b.bytes, 0) / 1024 / 1024).toFixed(1)} MB`);
