import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'angulux-migrate.mjs');

const FILES = {
    'package.json': JSON.stringify({ name: 'app', dependencies: { primeng: '21.1.9' } }, null, 2),
    'src/app.html': '<p-button label="x"></p-button>\n',
    'src/app.ts': "import { ButtonModule } from 'primeng/button';\n"
};

function project({ git = true, dirty = false } = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'wgate-'));
    for (const [rel, contents] of Object.entries(FILES)) {
        const full = join(dir, rel);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, contents);
    }
    if (git) {
        const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
        g('init', '-q');
        g('config', 'user.email', 'test@example.com');
        g('config', 'user.name', 'Test');
        g('add', '-A');
        g('commit', '-qm', 'base');
        if (dirty) writeFileSync(join(dir, 'src', 'extra.html'), '<div>uncommitted</div>\n');
    }
    return dir;
}

function run(dir, args = []) {
    try {
        return { code: 0, output: execFileSync(process.execPath, [BIN, dir, ...args], { encoding: 'utf8' }) };
    } catch (e) {
        return { code: e.status, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
}

test('refuses to write when the tree has uncommitted changes', () => {
    // The whole safety model is "you can throw this away". Writing on top of work that is
    // not committed destroys the only undo the user has.
    const dir = project({ dirty: true });
    try {
        const { code, output } = run(dir, ['--write']);
        assert.equal(code, 1);
        assert.match(output, /uncommitted|clean/i);
        assert.match(readFileSync(join(dir, 'src/app.html'), 'utf8'), /p-button/, 'nothing may be written');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('refuses to write outside version control at all', () => {
    // No repository means no revert. The promise this tool makes is revertibility, so the
    // honest move is to decline rather than to quietly become irreversible.
    const dir = project({ git: false });
    try {
        const { code, output } = run(dir, ['--write']);
        assert.equal(code, 1);
        assert.match(output, /git|version control/i);
        assert.match(readFileSync(join(dir, 'src/app.html'), 'utf8'), /p-button/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('writes when the tree is clean, and says so', () => {
    const dir = project();
    try {
        const { code, output } = run(dir, ['--write']);
        assert.equal(code, 0);
        assert.match(readFileSync(join(dir, 'src/app.html'), 'utf8'), /agl-button/);
        assert.doesNotMatch(readFileSync(join(dir, 'src/app.html'), 'utf8'), /p-button/);
        assert.match(output, /wrote|changed|applied/i);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('everything it wrote is revertible with one git command', () => {
    const dir = project();
    try {
        run(dir, ['--write']);
        execFileSync('git', ['checkout', '--', '.'], { cwd: dir, stdio: 'ignore' });
        assert.equal(readFileSync(join(dir, 'src/app.html'), 'utf8'), FILES['src/app.html']);
        assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), FILES['package.json']);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('there is no flag that bypasses the clean-tree requirement', () => {
    const dir = project({ dirty: true });
    try {
        for (const escape of ['--force', '-f', '--yes', '--no-verify']) {
            const { code } = run(dir, ['--write', escape]);
            assert.equal(code, 1, `${escape} must not become an escape hatch`);
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
