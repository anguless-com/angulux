import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * The boundary table is a legal record. Two copies of it in one repository is not a tidiness
 * problem — it is a record that can disagree with itself, where one half quietly stops being
 * enforced. This asserts there is exactly one declaration.
 */
/**
 * NOTE: `git grep -E` is POSIX ERE — it does NOT understand `\s`. A pattern using it matches
 * nothing and the test then fails with "found 0", which reads exactly like "the file is
 * missing" rather than "the pattern is wrong". Written without `\s` for that reason, and the
 * assertions below check the found path, so a pattern that silently stops matching cannot
 * pass as success.
 */
function grepDeclarations(token) {
    let out = '';
    try {
        out = execFileSync('git', ['grep', '-n', '-E', `^(export )?const ${token}`, '--', ':!ref/'], {
            cwd: repoRoot,
            encoding: 'utf8'
        });
    } catch (e) {
        // git grep exits 1 when nothing matched; that is a real answer, not an error.
        if (e.status !== 1) throw e;
    }
    return out.split('\n').filter(Boolean);
}

test('FIRST_COMMERCIAL is declared in exactly one place', () => {
    const hits = grepDeclarations('FIRST_COMMERCIAL');
    assert.equal(hits.length, 1, `expected one declaration, found:\n${hits.join('\n')}`);
    assert.match(hits[0], /packages\/angulux-license-guard\/src\/boundary\.mjs/);
});

test('ALWAYS_COMMERCIAL is declared in exactly one place', () => {
    const hits = grepDeclarations('ALWAYS_COMMERCIAL');
    assert.equal(hits.length, 1, `expected one declaration, found:\n${hits.join('\n')}`);
    assert.match(hits[0], /packages\/angulux-license-guard\/src\/boundary\.mjs/);
});
