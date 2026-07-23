import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'angulux-license-guard.mjs');

/**
 * The CLI end-to-end over a pnpm lockfile.
 *
 * The npm path is covered in cli.test.mjs. Both formats are exercised through the real
 * binary because the two readers are separate code paths, and a guard that only works for
 * whichever package manager its author happens to use is a guard with a hole in it.
 */
function pnpmProject(lines, extra = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'cli-pnpm-'));
    writeFileSync(join(dir, 'pnpm-lock.yaml'), ['lockfileVersion: 9.0', 'packages:', ...lines].join('\n'));
    for (const [name, contents] of Object.entries(extra)) writeFileSync(join(dir, name), contents);
    return dir;
}

function runGuard(dir) {
    try {
        return { code: 0, output: execFileSync(process.execPath, [BIN, dir], { encoding: 'utf8' }) };
    } catch (e) {
        return { code: e.status, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
}

test('pnpm: an MIT tree exits 0', () => {
    const dir = pnpmProject(['  primeng@21.1.9:', '    resolution: {}', "  '@primeuix/themes@2.0.3':", '    resolution: {}']);
    try {
        const { code, output } = runGuard(dir);
        assert.equal(code, 0);
        assert.match(output, /primeng@21\.1\.9/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('pnpm: a commercial version exits 1', () => {
    const dir = pnpmProject(['  primeng@22.0.0:', '    resolution: {}']);
    try {
        assert.equal(runGuard(dir).code, 1);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('pnpm: a peer-suffixed key is still read correctly', () => {
    const dir = pnpmProject(['  primeng@21.1.9(@angular/core@22.0.8):', '    resolution: {}']);
    try {
        assert.equal(runGuard(dir).code, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('pnpm: a tarball URL cannot be verified, so it fails', () => {
    const dir = pnpmProject(['  primeng@https://example.com/primeng-22.0.0.tgz:', '    resolution: {}']);
    try {
        const { code, output } = runGuard(dir);
        assert.equal(code, 1);
        assert.match(output, /could not be verified|not a semver/i);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('pnpm: acknowledgement works across the pnpm path too', () => {
    const dir = pnpmProject(['  primeng@22.0.0:', '    resolution: {}'], {
        '.angulux-license-guard.json': JSON.stringify({
            acknowledged: [{ name: 'primeng', version: '22.0.0', reason: 'licensed' }]
        })
    });
    try {
        assert.equal(runGuard(dir).code, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
