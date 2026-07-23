import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONFIG_FILENAME, loadAcknowledgements, applyAcknowledgements } from '../src/acknowledge.mjs';

/**
 * These assert against REAL files on disk, not an in-memory object. The config is a format a
 * human authors in another repository — a boundary a type checker cannot see across.
 */
function projectWith(contents) {
    const dir = mkdtempSync(join(tmpdir(), 'ack-'));
    if (contents !== undefined) writeFileSync(join(dir, CONFIG_FILENAME), contents);
    return dir;
}

test('a project with no config acknowledges nothing', () => {
    const dir = projectWith(undefined);
    try {
        assert.deepEqual(loadAcknowledgements(dir).entries, []);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a well-formed entry is loaded', () => {
    const dir = projectWith(
        JSON.stringify({
            acknowledged: [{ name: '@primeuix/themes', version: '3.0.1', reason: 'we hold a PrimeUI licence' }]
        })
    );
    try {
        const { entries, errors } = loadAcknowledgements(dir);
        assert.deepEqual(errors, []);
        assert.equal(entries.length, 1);
        assert.equal(entries[0].name, '@primeuix/themes');
        assert.equal(entries[0].version, '3.0.1');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('an entry without a version is REJECTED, not treated as a wildcard', () => {
    const dir = projectWith(JSON.stringify({ acknowledged: [{ name: 'primeng' }] }));
    try {
        const { errors } = loadAcknowledgements(dir);
        assert.equal(errors.length, 1);
        assert.match(errors[0], /version/i);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a wildcard version is REJECTED', () => {
    const dir = projectWith(JSON.stringify({ acknowledged: [{ name: 'primeng', version: '*' }] }));
    try {
        const { errors } = loadAcknowledgements(dir);
        assert.equal(errors.length, 1);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('an unknown field is REJECTED rather than ignored', () => {
    // A typo in a legal opt-out must be loud. Silently ignoring `verison` would leave the
    // author believing they had acknowledged something they had not.
    const dir = projectWith(
        JSON.stringify({ acknowledged: [{ name: 'primeng', verison: '22.0.0' }] })
    );
    try {
        const { errors } = loadAcknowledgements(dir);
        assert.ok(errors.length >= 1);
        assert.match(errors.join(' '), /verison|unknown/i);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a global off switch does not exist', () => {
    const dir = projectWith(JSON.stringify({ acknowledged: [], disabled: true }));
    try {
        const { errors } = loadAcknowledgements(dir);
        assert.ok(errors.length >= 1, 'an unknown top-level key must be rejected');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('malformed JSON is an error, never a silent empty list', () => {
    const dir = projectWith('{ not json');
    try {
        const { errors } = loadAcknowledgements(dir);
        assert.equal(errors.length, 1);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('acknowledging a package at its exact version suppresses that violation', () => {
    const violations = [{ name: 'primeng', version: '22.0.0', reason: 'x' }];
    const left = applyAcknowledgements(violations, [{ name: 'primeng', version: '22.0.0' }]);
    assert.deepEqual(left, []);
});

test('an acknowledgement stops applying when the version moves', () => {
    // This is the point of requiring the version: a bump is a new artifact nobody looked at.
    const violations = [{ name: 'primeng', version: '22.1.0', reason: 'x' }];
    const left = applyAcknowledgements(violations, [{ name: 'primeng', version: '22.0.0' }]);
    assert.equal(left.length, 1);
});

test('acknowledging one package leaves the others failing', () => {
    const violations = [
        { name: 'primeng', version: '22.0.0', reason: 'x' },
        { name: 'primevue', version: '5.0.0', reason: 'x' }
    ];
    const left = applyAcknowledgements(violations, [{ name: 'primeng', version: '22.0.0' }]);
    assert.deepEqual(left.map((v) => v.name), ['primevue']);
});
