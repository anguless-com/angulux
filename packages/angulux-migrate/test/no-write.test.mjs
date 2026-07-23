import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'angulux-migrate.mjs');

function tempProject(files) {
    const dir = mkdtempSync(join(tmpdir(), 'nowrite-'));
    for (const [rel, contents] of Object.entries(files)) {
        const full = join(dir, rel);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, contents);
    }
    return dir;
}

/** A hash of every file's path and bytes — the only honest way to assert "wrote nothing". */
function fingerprint(dir) {
    const h = createHash('sha256');
    const walk = (d) => {
        for (const name of readdirSync(d).sort()) {
            const full = join(d, name);
            if (statSync(full).isDirectory()) walk(full);
            else {
                h.update(full.slice(dir.length));
                h.update(readFileSync(full));
            }
        }
    };
    walk(dir);
    return h.digest('hex');
}

function runMigrate(dir, args = []) {
    try {
        return { code: 0, output: execFileSync(process.execPath, [BIN, dir, ...args], { encoding: 'utf8' }) };
    } catch (e) {
        return { code: e.status, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
}

const PROJECT = {
    'package.json': JSON.stringify({ name: 'app', dependencies: { primeng: '21.1.9' } }, null, 2),
    'src/app.html': '<p-button label="x"></p-button>\n<div pTooltip="t"></div>\n',
    'src/app.component.ts': "import { ButtonModule } from 'primeng/button';\n",
    'src/styles.css': '.p-button { color: red; }\n'
};

test('a default run leaves the working tree byte-identical', () => {
    const dir = tempProject(PROJECT);
    try {
        const before = fingerprint(dir);
        const { code } = runMigrate(dir);
        assert.equal(fingerprint(dir), before, 'the default run must not write anything');
        assert.equal(code, 0, 'a report is not a failure');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('the report names every category with a count', () => {
    const dir = tempProject(PROJECT);
    try {
        const { output } = runMigrate(dir);
        for (const category of ['dependency', 'import', 'element', 'attribute']) {
            assert.match(output, new RegExp(category, 'i'), `report is missing the ${category} category`);
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('the report gives file and line for individual changes', () => {
    const dir = tempProject(PROJECT);
    try {
        const { output } = runMigrate(dir);
        assert.match(output, /src\/app\.html:1/);
        assert.match(output, /src\/app\.component\.ts:1/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('it says plainly that nothing was written', () => {
    const dir = tempProject(PROJECT);
    try {
        assert.match(runMigrate(dir).output, /nothing was (written|changed)|no files were/i);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a project with no PrimeNG says so and exits 0', () => {
    const dir = tempProject({ 'package.json': '{"name":"x"}', 'src/a.html': '<div></div>' });
    try {
        const { code, output } = runMigrate(dir);
        assert.equal(code, 0);
        assert.match(output, /no primeng|nothing to migrate/i);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
