import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'angulux-license-guard.mjs');

function projectWith(files) {
    const dir = mkdtempSync(join(tmpdir(), 'cli-'));
    for (const [name, contents] of Object.entries(files)) writeFileSync(join(dir, name), contents);
    return dir;
}

/** Spawns the real binary. Exit codes are a contract other people's CI branches on, so they
 *  are asserted against a real process, not a function return value. */
function runGuard(dir) {
    try {
        const stdout = execFileSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
        return { code: 0, output: stdout };
    } catch (e) {
        return { code: e.status, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
}

const npmLock = (deps) =>
    JSON.stringify({
        packages: Object.fromEntries(Object.entries(deps).map(([n, v]) => [`node_modules/${n}`, { version: v }]))
    });

test('exit 0 when the tree is clean', () => {
    const dir = projectWith({ 'package-lock.json': npmLock({ lodash: '4.17.21', primeng: '21.1.9' }) });
    try {
        assert.equal(runGuard(dir).code, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('exit 1 on a commercial version, naming the package', () => {
    const dir = projectWith({ 'package-lock.json': npmLock({ primeng: '22.0.0' }) });
    try {
        const { code, output } = runGuard(dir);
        assert.equal(code, 1);
        assert.match(output, /primeng/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('exit 1 on an unrecognised PrimeTek package', () => {
    const dir = projectWith({ 'package-lock.json': npmLock({ '@primeuix/unknown-thing': '1.0.0' }) });
    try {
        assert.equal(runGuard(dir).code, 1);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('exit 1 when there is no lockfile at all', () => {
    const dir = projectWith({ 'package.json': '{}' });
    try {
        const { code, output } = runGuard(dir);
        assert.equal(code, 1);
        assert.match(output, /lockfile/i);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('an acknowledged package returns the run to exit 0', () => {
    const dir = projectWith({
        'package-lock.json': npmLock({ primeng: '22.0.0' }),
        '.angulux-license-guard.json': JSON.stringify({
            acknowledged: [{ name: 'primeng', version: '22.0.0', reason: 'we hold a licence' }]
        })
    });
    try {
        assert.equal(runGuard(dir).code, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a malformed acknowledgement file fails the run rather than being ignored', () => {
    const dir = projectWith({
        'package-lock.json': npmLock({ primeng: '22.0.0' }),
        '.angulux-license-guard.json': JSON.stringify({ acknowledged: [{ name: 'primeng' }] })
    });
    try {
        assert.equal(runGuard(dir).code, 1);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('every run states the date the boundary table was verified', () => {
    const dir = projectWith({ 'package-lock.json': npmLock({ lodash: '4.17.21' }) });
    try {
        assert.match(runGuard(dir).output, /\d{4}-\d{2}-\d{2}/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('the violating run also states the verified date', () => {
    const dir = projectWith({ 'package-lock.json': npmLock({ primeng: '22.0.0' }) });
    try {
        assert.match(runGuard(dir).output, /\d{4}-\d{2}-\d{2}/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
