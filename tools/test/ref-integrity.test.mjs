import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseOrigins, judgeOrigins, auditRefIntegrity, ORIGIN_HEADING } from '../lib/ref-integrity.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The gate over Constitution P2: the evidence clones in `ref/` are at the recorded commit and
 * unmodified.
 *
 * The real `ref/` is never touched to prove the gate bites: planting a violation there would
 * be the violation. Every red case below is built in a temporary directory with real git.
 */

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

test('the real PROVENANCE.md yields both origins, with full commits', () => {
    // If section 2 is reworded so the parser reads nothing, the gate fails closed at runtime;
    // this says so at test time and names the cause.
    const origins = parseOrigins(readFileSync(join(repoRoot, 'PROVENANCE.md'), 'utf8'));
    assert.deepEqual(
        origins.map((o) => o.path),
        ['ref/primeng', 'ref/primeuix']
    );
    for (const o of origins) assert.match(o.commit, /^[0-9a-f]{40}$/);
});

test('a missing heading reads as no origins, never as a crash', () => {
    assert.deepEqual(parseOrigins('# Provenance\n\n| `github.com/x/y` | tag | `' + A + '` |\n'), []);
});

test('a clone at the recorded commit and clean is verified', () => {
    const r = judgeOrigins([{ path: 'ref/x', commit: A }], new Map([['ref/x', { head: A, dirty: [] }]]));
    assert.equal(r.problems.length, 0);
    assert.equal(r.verified.length, 1);
});

test('a clone at another commit is a problem that names both commits', () => {
    const r = judgeOrigins([{ path: 'ref/x', commit: A }], new Map([['ref/x', { head: B, dirty: [] }]]));
    assert.equal(r.verified.length, 0);
    assert.match(r.problems[0].what, new RegExp(`${B}.*${A}`));
});

test('a modified clone is a problem even at the right commit', () => {
    const r = judgeOrigins([{ path: 'ref/x', commit: A }], new Map([['ref/x', { head: A, dirty: ['src/button.ts'] }]]));
    assert.equal(r.verified.length, 0);
    assert.match(r.problems[0].what, /src\/button\.ts/);
});

test('a clone git cannot read is a problem, not a pass', () => {
    const r = judgeOrigins([{ path: 'ref/x', commit: A }], new Map([['ref/x', { error: 'not a git repository' }]]));
    assert.equal(r.problems.length, 1);
});

test('a clone that is not on disk is reported as absent, neither verified nor failed', () => {
    const r = judgeOrigins([{ path: 'ref/x', commit: A }], new Map());
    assert.deepEqual([r.problems.length, r.verified.length, r.absent.length], [0, 0, 1]);
});

/** A throwaway project root with a real one-commit clone at ref/sample. */
function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'ref-integrity-'));
    const clone = join(root, 'ref', 'sample');
    mkdirSync(clone, { recursive: true });
    const git = (...args) =>
        execFileSync('git', ['-C', clone, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...args], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
    git('init', '-q');
    writeFileSync(join(clone, 'file.txt'), 'upstream\n');
    git('add', '.');
    git('commit', '-q', '-m', 'upstream');
    const head = git('rev-parse', 'HEAD').trim();
    const record = (commit) => writeFileSync(join(root, 'PROVENANCE.md'), `# P\n\n${ORIGIN_HEADING} (test)\n\n| Source | Ref | Commit |\n|---|---|---|\n| \`github.com/owner/sample\` | tag | \`${commit}\` |\n\n## 3. Next\n`);
    record(head);
    return { root, clone, head, record, done: () => rmSync(root, { recursive: true, force: true }) };
}

test('end to end: green on an untouched clone, red on each way of touching it', () => {
    const f = fixture();
    try {
        const clean = auditRefIntegrity(f.root);
        assert.equal(clean.ok, true);
        assert.match(clean.lines[0], /^✓ .*1 evidence clone/);

        // An edited tracked file.
        writeFileSync(join(f.clone, 'file.txt'), 'edited\n');
        assert.equal(auditRefIntegrity(f.root).ok, false);
        writeFileSync(join(f.clone, 'file.txt'), 'upstream\n');
        assert.equal(auditRefIntegrity(f.root).ok, true);

        // A file a build left behind.
        writeFileSync(join(f.clone, 'dist.js'), '');
        const untracked = auditRefIntegrity(f.root);
        assert.equal(untracked.ok, false);
        assert.ok(untracked.lines.some((l) => l.includes('dist.js')));
        rmSync(join(f.clone, 'dist.js'));

        // The right tree at a commit the record does not name.
        f.record(B);
        assert.equal(auditRefIntegrity(f.root).ok, false);
        f.record(f.head);

        // A plain directory where the clone should be: without its own .git, git would
        // answer for whatever repository encloses it.
        rmSync(join(f.clone, '.git'), { recursive: true });
        assert.equal(auditRefIntegrity(f.root).ok, false);
    } finally {
        f.done();
    }
});

test('end to end: a record nobody can parse fails; no ref/ at all says "nothing audited"', () => {
    const f = fixture();
    try {
        writeFileSync(join(f.root, 'PROVENANCE.md'), '# P\n\nreworded, no table\n');
        assert.equal(auditRefIntegrity(f.root).ok, false);

        rmSync(join(f.root, 'ref'), { recursive: true });
        const none = auditRefIntegrity(f.root);
        assert.equal(none.ok, true);
        assert.match(none.lines[0], /^· .*nothing audited/);
    } finally {
        f.done();
    }
});
