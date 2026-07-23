import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '../src/scan.mjs';

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'app');

const of = (findings, category) => findings.filter((f) => f.category === category);

function tempProject(files) {
    const dir = mkdtempSync(join(tmpdir(), 'migrate-'));
    for (const [rel, contents] of Object.entries(files)) {
        const full = join(dir, rel);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, contents);
    }
    return dir;
}

test('finds the dependency declaration', () => {
    const f = of(scan(FIXTURE), 'dependency');
    assert.equal(f.length, 1);
    assert.match(f[0].file, /package\.json$/);
    assert.equal(f[0].from, 'primeng');
    assert.equal(f[0].to, '@anguless/angulux');
});

test('finds every primeng import path, with its line', () => {
    const f = of(scan(FIXTURE), 'import');
    assert.equal(f.length, 3); // primeng/button, primeng/table, primeng/api
    for (const hit of f) {
        assert.ok(hit.line > 0, 'every finding carries a line number');
        assert.match(hit.to, /^@anguless\/angulux/);
    }
    assert.deepEqual(f.map((h) => h.from).sort(), ['primeng/api', 'primeng/button', 'primeng/table']);
});

test('finds element selectors in both .html and inline templates', () => {
    const f = of(scan(FIXTURE), 'element');
    const names = [...new Set(f.map((h) => h.from))].sort();
    assert.deepEqual(names, ['p-badge', 'p-button', 'p-card', 'p-table']);
    assert.ok(
        f.some((h) => /\.ts$/.test(h.file)),
        'an inline template in a .ts file must be scanned too'
    );
    assert.ok(f.some((h) => /\.html$/.test(h.file)));
});

test('finds attribute selectors', () => {
    const f = of(scan(FIXTURE), 'attribute');
    const names = [...new Set(f.map((h) => h.from))].sort();
    assert.deepEqual(names, ['pButton', 'pSortableColumn', 'pTemplate', 'pTooltip']);
});

test('NEVER reports a .p-* CSS class — the fork keeps those unchanged', () => {
    // Constitution P5. The fixture has .p-button in a styles block and .p-button /
    // .p-datatable in a stylesheet. A pattern-based rename would rewrite all three and
    // silently break the consumer's theming.
    const findings = scan(FIXTURE);
    for (const f of findings) {
        assert.notEqual(f.category, 'css', 'stylesheets must not be reported at all');
    }
    assert.equal(findings.filter((f) => /\.css$/.test(f.file)).length, 0);

    // The .ts fixture contains `.p-button { border-radius: 4px; }` in a styles block AND
    // `<p-button>...</p-button>` in the template. Exactly two element findings means the
    // template pair was caught and the CSS class was not — a count of three would be the
    // bug, and it would be invisible in a report that only listed names.
    const inTs = of(findings, 'element').filter((f) => /\.ts$/.test(f.file) && f.from === 'p-button');
    assert.equal(inTs.length, 2, 'the .p-button CSS class must not be counted as a selector');
});

test("does not touch a project's own p-* component that PrimeNG never had", () => {
    // Matching is an allowlist. A pattern would rename someone's own <p-widget> and their
    // app would stop compiling for a reason they could not possibly guess.
    const dir = tempProject({
        'app.html': '<p-widget></p-widget>\n<p-button></p-button>\n',
        'package.json': '{}'
    });
    try {
        const f = of(scan(dir), 'element');
        // Open and close tag are two separate edits, so p-button appears twice. What matters
        // is that p-widget appears zero times.
        assert.deepEqual([...new Set(f.map((h) => h.from))], ['p-button']);
        assert.equal(f.length, 2);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('does not report an attribute that merely starts with p', () => {
    const dir = tempProject({
        'app.html': '<div pButton pCustomThing [placeholder]="x"></div>',
        'package.json': '{}'
    });
    try {
        assert.deepEqual(of(scan(dir), 'attribute').map((h) => h.from), ['pButton']);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a project with no PrimeNG at all reports nothing', () => {
    const dir = tempProject({ 'app.html': '<div class="x"></div>', 'package.json': '{"name":"x"}' });
    try {
        assert.deepEqual(scan(dir), []);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('skips node_modules — migrating a dependency is not the job', () => {
    const dir = tempProject({
        'package.json': '{}',
        'node_modules/primeng/x.html': '<p-button></p-button>',
        'app.html': '<p-card></p-card>'
    });
    try {
        assert.deepEqual([...new Set(of(scan(dir), 'element').map((h) => h.from))], ['p-card']);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
