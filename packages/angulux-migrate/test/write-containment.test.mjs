/**
 * The set this tool writes to must be the set `checkWritable()` vouched for.
 *
 * `checkWritable()` proves one thing: this is a git work tree and it is clean, so everything
 * the run does can be undone with `git checkout -- .`. That is the tool's only promise. But the
 * scan enumerates the FILESYSTEM while the promise is about the git INDEX, and those two sets
 * are not the same. Every test here pins one place they used to diverge — each measured on
 * 2026-08-29 against the code as it then stood, each producing an edit that survived a revert.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, symlinkSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scan } from '../src/scan.mjs';
import { apply } from '../src/apply.mjs';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'angulux-migrate.mjs');

const MARKUP = '<p-button label="x"></p-button>\n';

const BASE = {
    'package.json': JSON.stringify({ name: 'app', dependencies: { primeng: '21.1.9' } }, null, 2),
    'src/app.html': MARKUP
};

function project(extra = {}, { git = false } = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'wcontain-'));
    for (const [rel, contents] of Object.entries({ ...BASE, ...extra })) {
        const full = join(dir, rel);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, contents);
    }
    if (git) {
        const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
        g('init', '-q');
        g('config', 'user.email', 'test@example.com');
        g('config', 'user.name', 'Test');
        // Same reason as write-gate.test.mjs: the fixture must not inherit the developer's
        // global core.autocrlf, or a byte comparison after a revert measures git's normalisation
        // rather than this tool's behaviour.
        g('config', 'core.autocrlf', 'false');
        g('add', '-A');
        g('commit', '-qm', 'base');
    }
    return dir;
}

test('scan does not follow a symlink out of the project', () => {
    const outside = mkdtempSync(join(tmpdir(), 'wcontain-outside-'));
    writeFileSync(join(outside, 'leaked.html'), MARKUP);

    const dir = project();
    const link = join(dir, 'linked');

    // 'junction' so this works on Windows without elevation; on POSIX the type argument is
    // ignored and an ordinary symlink is created. If it throws, FAIL — never skip. A test that
    // quietly opts out on the one platform the maintainer develops on is not a test.
    try {
        symlinkSync(outside, link, 'junction');
    } catch (error) {
        assert.fail(`could not create the link this test exists to exercise: ${error.message}`);
    }
    assert.equal(lstatSync(link).isSymbolicLink(), true, 'the fixture link must look like a link to lstat');

    const files = scan(dir).map((f) => f.file);

    assert.equal(
        files.some((f) => f.includes('leaked')),
        false,
        `scan reached outside the project through the link: ${JSON.stringify(files)}`
    );
    // The scan must still see the ordinary file, or this test would pass on a walk that found
    // nothing at all.
    assert.equal(
        files.some((f) => f.includes('app.html')),
        true,
        'scan stopped finding ordinary files — the guard is too broad'
    );
});

/**
 * Can this machine create a symlink to a FILE?
 *
 * Windows needs SeCreateSymbolicLinkPrivilege for that — Developer Mode or an elevated shell —
 * and throws EPERM without it. A junction needs no privilege, which is why the directory test
 * above runs everywhere. Measured on the maintainer's machine 2026-08-29: junction yes, file
 * symlink EPERM.
 *
 * So this one capability-skips rather than failing. It is a DECLARED skip: node:test prints it,
 * the reason names the privilege, and CI runs `npm run test:tools` on ubuntu-latest where the
 * call succeeds — so the assertion below is executed on every push even though it cannot be
 * locally on Windows. That is the difference between a skip and a hole.
 */
const fileSymlinkSkip = (() => {
    const probeDir = mkdtempSync(join(tmpdir(), 'wcontain-probe-'));
    const target = join(probeDir, 't.txt');
    writeFileSync(target, 'x');
    try {
        symlinkSync(target, join(probeDir, 'l.txt'), 'file');
        return false;
    } catch (error) {
        return `this platform cannot create a file symlink unprivileged (${error.code}); runs on CI (ubuntu-latest)`;
    }
})();

test('scan does not follow a symlink to a single file', { skip: fileSymlinkSkip }, () => {
    // This is the case `lstat` alone does NOT cover, and it is why the explicit
    // isSymbolicLink() skip is load-bearing rather than decorative. A linked DIRECTORY is
    // already excluded because lstat reports the link, not the target, so isDirectory() is
    // false and the walk never recurses. A linked FILE with a template extension sails
    // straight through that check and gets yielded like any other file — and the write then
    // lands on the target, outside the tree checkWritable() vouched for.
    const outside = mkdtempSync(join(tmpdir(), 'wcontain-outside-'));
    const target = join(outside, 'real.html');
    writeFileSync(target, MARKUP);

    const dir = project();
    const link = join(dir, 'src', 'linked.html');

    try {
        symlinkSync(target, link, 'file');
    } catch (error) {
        assert.fail(`could not create the file link this test exists to exercise: ${error.message}`);
    }

    const files = scan(dir).map((f) => f.file);

    assert.equal(
        files.some((f) => f.includes('linked.html')),
        false,
        `scan picked up a symlinked file, which writes outside the project: ${JSON.stringify(files)}`
    );
    assert.equal(readFileSync(target, 'utf8'), MARKUP, 'the link target must be untouched');
});

test('--write leaves a git-ignored file alone, and says so', () => {
    const dir = project(
        {
            '.gitignore': 'vendor/\n',
            'vendor/v.html': MARKUP
        },
        { git: true }
    );

    const before = readFileSync(join(dir, 'vendor', 'v.html'), 'utf8');
    assert.equal(before, MARKUP, 'fixture precondition');

    const output = execFileSync(process.execPath, [BIN, dir, '--write'], { encoding: 'utf8' });

    assert.equal(
        readFileSync(join(dir, 'vendor', 'v.html'), 'utf8'),
        MARKUP,
        'an ignored file was rewritten — `git checkout -- .` cannot undo that'
    );
    assert.match(output, /git does not track those files/);
    // The tracked file still gets migrated, or the filter has swallowed the whole run.
    assert.match(readFileSync(join(dir, 'src', 'app.html'), 'utf8'), /agl-button/);
});

test('apply refuses a finding whose path resolves outside the project', () => {
    const dir = project();

    assert.throws(
        () =>
            apply(dir, [
                { category: 'element', file: join('..', 'escape.html'), line: 1, from: 'p-button', to: 'agl-button' }
            ]),
        /refusing to write .* which is outside/,
        'apply() is exported, so it must guard its own input rather than trust the caller'
    );
});
