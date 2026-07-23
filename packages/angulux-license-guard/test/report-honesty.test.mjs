import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.mjs';
import { detect } from '../src/detect.mjs';

function projectWith(deps) {
    const dir = mkdtempSync(join(tmpdir(), 'honest-'));
    writeFileSync(
        join(dir, 'package-lock.json'),
        JSON.stringify({
            packages: Object.fromEntries(Object.entries(deps).map(([n, v]) => [`node_modules/${n}`, { version: v }]))
        })
    );
    return dir;
}

test('violations are classified as commercial or merely unverified', () => {
    const r = detect([
        { name: 'primeng', version: '22.0.0' },
        { name: '@primeuix/brand-new', version: '1.0.0' }
    ]);
    const byName = Object.fromEntries(r.violations.map((v) => [v.name, v.kind]));
    assert.equal(byName['primeng'], 'commercial');
    assert.equal(byName['@primeuix/brand-new'], 'unverified');
});

test('an unverifiable package is NOT reported as "commercially licensed detected"', () => {
    // The tool does not know this package is commercial. Saying so would be a stronger claim
    // than the evidence supports — on a licensing question, that is the one thing it must
    // never do.
    const dir = projectWith({ '@primeuix/brand-new': '1.0.0' });
    try {
        const { code, lines } = run(dir);
        const text = lines.join('\n');
        assert.equal(code, 1);
        assert.doesNotMatch(text, /COMMERCIALLY LICENSED PRIMETEK PACKAGE DETECTED/);
        assert.match(text, /could not be verified|UNVERIFIED/i);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('an unverifiable package is not told to "downgrade to the last MIT release"', () => {
    // There is no known MIT release to downgrade to — the table has never seen this package.
    const dir = projectWith({ '@primeuix/brand-new': '1.0.0' });
    try {
        assert.doesNotMatch(run(dir).lines.join('\n'), /downgrade to the last MIT release/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a genuinely commercial package still gets the strong headline and the downgrade advice', () => {
    const dir = projectWith({ primeng: '22.0.0' });
    try {
        const text = run(dir).lines.join('\n');
        assert.match(text, /COMMERCIALLY LICENSED/);
        assert.match(text, /downgrade/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a mixed tree reports both kinds, each in its own terms', () => {
    const dir = projectWith({ primeng: '22.0.0', '@primeuix/brand-new': '1.0.0' });
    try {
        const text = run(dir).lines.join('\n');
        assert.match(text, /COMMERCIALLY LICENSED/);
        assert.match(text, /could not be verified|UNVERIFIED/i);
        assert.match(text, /primeng@22\.0\.0/);
        assert.match(text, /@primeuix\/brand-new@1\.0\.0/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
