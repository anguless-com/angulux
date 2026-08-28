/**
 * The stamper is the one release step a dry run cannot rehearse.
 *
 * `semantic-release --dry-run` skips `prepare`, and `prepare` is where the computed version is
 * written into the manifests. The workflow then decides whether to publish by comparing the
 * manifest before that step to the manifest after it — so a stamper that silently did nothing
 * would produce a green run that published nothing, with the tag already pushed. That failure
 * has happened in this repository for an adjacent reason and is written up in release/README.md.
 *
 * These tests are therefore not optional coverage. They are the only place the behaviour is
 * checked at all.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { setRailVersions } from '../../release/set-rail-versions.mjs';
import { RAILS } from '../../release/rails.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(repoRoot, 'release', 'set-rail-versions.mjs');

/** A throwaway tree holding a manifest for every package on `rail`, all at `version`. */
function fixture(rail, version = '1.0.0') {
    const root = mkdtempSync(join(tmpdir(), 'railver-'));
    for (const prefix of RAILS[rail]) {
        const dir = join(root, prefix);
        mkdirSync(dir, { recursive: true });
        // Four-space indent, like the real manifests — the stamper preserves it, and a test
        // that used a different shape would not notice if it stopped.
        writeFileSync(join(dir, 'package.json'), `{\n    "name": "x",\n    "version": "${version}"\n}\n`);
    }
    return root;
}

const versionIn = (root, prefix) => JSON.parse(readFileSync(join(root, prefix, 'package.json'), 'utf8')).version;

test('stamps every package on the rail', () => {
    const root = fixture('tools');

    const result = setRailVersions('tools', '1.0.1', root);

    assert.equal(result.stamped.length, RAILS.tools.length);
    assert.equal(result.unchanged.length, 0);
    for (const prefix of RAILS.tools) {
        assert.equal(versionIn(root, prefix), '1.0.1', `${prefix} was not stamped`);
    }
});

test('preserves the surrounding formatting', () => {
    const root = fixture('tools');
    const prefix = RAILS.tools[0];

    setRailVersions('tools', '2.3.4', root);

    // The whole point of editing textually rather than round-tripping JSON: everything except
    // the one line is byte-identical.
    assert.equal(readFileSync(join(root, prefix, 'package.json'), 'utf8'), '{\n    "name": "x",\n    "version": "2.3.4"\n}\n');
});

test('derives its package list from RAILS, so it cannot drift from the train', () => {
    // Not a tautology: it is asserting the coupling exists. set-fork-versions.mjs hard-codes
    // its list, which is the drift this file was written to avoid.
    const root = fixture('forks');

    const result = setRailVersions('forks', '9.9.9', root);

    assert.deepEqual(result.stamped.sort(), [...RAILS.forks].sort());
});

test('refuses an unknown rail', () => {
    assert.throws(() => setRailVersions('nope', '1.0.1'), /unknown release train "nope"/);
});

test('refuses a version that is not semver', () => {
    const root = fixture('tools');
    for (const bad of ['', 'v1.0.1', '1.0', 'latest', undefined]) {
        assert.throws(() => setRailVersions('tools', bad, root), /not a valid semver version/, `accepted ${JSON.stringify(bad)}`);
    }
});

test('reports packages that were already at the version', () => {
    const root = fixture('tools', '1.0.1');

    const result = setRailVersions('tools', '1.0.1', root);

    assert.equal(result.stamped.length, 0);
    assert.deepEqual(result.unchanged.sort(), [...RAILS.tools].sort());
});

test('the CLI exits non-zero when it stamped nothing', () => {
    // This is the guard that turns the silent-skip failure into a loud one. If every manifest
    // already carries the computed version — which is what a rail with no tag produces, since
    // semantic-release then computes 1.0.0 — the workflow would see no change and report "no
    // release warranted" while the tag was already pushed.
    let code = 0;
    let output = '';
    try {
        execFileSync(process.execPath, [SCRIPT, 'tools', readFileSync(join(repoRoot, RAILS.tools[0], 'package.json'), 'utf8').match(/"version"\s*:\s*"([^"]+)"/)[1]], {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
    } catch (error) {
        code = error.status;
        output = (error.stdout || '') + (error.stderr || '');
    }

    assert.equal(code, 1, 'stamping nothing must fail loudly');
    assert.match(output, /nothing was stamped/);
    // Matched on one line, not the whole sentence: the guidance is wrapped across lines, and a
    // regex spanning the wrap would break the next time anyone reflows the message.
    assert.match(output, /with no tag computes 1\.0\.0/);
});
