import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLock, NoLockfileError } from '../src/lockfile.mjs';

function projectWith(files) {
    const dir = mkdtempSync(join(tmpdir(), 'lock-'));
    for (const [name, contents] of Object.entries(files)) writeFileSync(join(dir, name), contents);
    return dir;
}
const find = (pkgs, name) => pkgs.find((p) => p.name === name);

test('reads an npm lockfile', () => {
    const dir = projectWith({
        'package-lock.json': JSON.stringify({
            lockfileVersion: 3,
            packages: {
                '': { name: 'app' },
                'node_modules/primeng': { version: '21.1.9' },
                'node_modules/lodash': { version: '4.17.21' }
            }
        })
    });
    try {
        const pkgs = readLock(dir);
        assert.equal(find(pkgs, 'primeng').version, '21.1.9');
        assert.equal(find(pkgs, 'lodash').version, '4.17.21');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('reads a nested npm dependency under its real name', () => {
    const dir = projectWith({
        'package-lock.json': JSON.stringify({
            packages: { 'node_modules/a/node_modules/primeng': { version: '22.0.0' } }
        })
    });
    try {
        assert.equal(find(readLock(dir), 'primeng').version, '22.0.0');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('reads a pnpm lockfile, including scoped names', () => {
    const dir = projectWith({
        'pnpm-lock.yaml': [
            'lockfileVersion: 9.0',
            'packages:',
            "  primeng@21.1.9:",
            '    resolution: {integrity: sha512-x}',
            "  '@primeuix/themes@2.0.3':",
            '    resolution: {integrity: sha512-y}'
        ].join('\n')
    });
    try {
        const pkgs = readLock(dir);
        assert.equal(find(pkgs, 'primeng').version, '21.1.9');
        assert.equal(find(pkgs, '@primeuix/themes').version, '2.0.3');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("strips pnpm's peer-dependency suffix", () => {
    const dir = projectWith({
        'pnpm-lock.yaml': ['packages:', '  primeng@21.1.9(@angular/core@22.0.8):', '    resolution: {}'].join('\n')
    });
    try {
        assert.equal(find(readLock(dir), 'primeng').version, '21.1.9');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a non-semver spec is reported with version null, never guessed', () => {
    const dir = projectWith({
        'pnpm-lock.yaml': [
            'packages:',
            '  primeng@https://example.com/primeng-22.0.0.tgz:',
            '    resolution: {}'
        ].join('\n')
    });
    try {
        const entry = find(readLock(dir), 'primeng');
        assert.equal(entry.version, null);
        assert.match(entry.raw, /^https:/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a project with no lockfile is an error — the lockfile is the evidence', () => {
    const dir = projectWith({ 'package.json': '{}' });
    try {
        assert.throws(() => readLock(dir), NoLockfileError);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
