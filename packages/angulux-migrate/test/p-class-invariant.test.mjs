import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'angulux-migrate.mjs');

/**
 * Constitution P5: `.p-*` CSS class names are unchanged by the fork, so that
 * @primeuix/themes and every consumer's custom styling keep working. The invariant the
 * project has used for every rename wave is that the COUNT of `.p-…` strings is identical
 * before and after. It is reproduced here because migrate performs the same class of
 * transformation, in someone else's repository.
 */
const P_CLASS = /\.p-[a-zA-Z][a-zA-Z0-9-]*/g;

function countPClasses(dir) {
    let n = 0;
    const walk = (d) => {
        for (const name of readdirSync(d)) {
            if (name === '.git' || name === 'node_modules') continue;
            const full = join(d, name);
            if (statSync(full).isDirectory()) walk(full);
            else n += (readFileSync(full, 'utf8').match(P_CLASS) ?? []).length;
        }
    };
    walk(dir);
    return n;
}

const FILES = {
    'package.json': JSON.stringify({ name: 'app', dependencies: { primeng: '21.1.9' } }, null, 2),
    'src/app.html': '<p-button class="p-button p-button-lg"></p-button>\n<p-table></p-table>\n',
    'src/app.ts': [
        "import { ButtonModule } from 'primeng/button';",
        '@Component({',
        "  template: `<p-card><span pTooltip='t'></span></p-card>`,",
        '  styles: [`.p-card { padding: 0; } .p-card-body { margin: 0; }`]',
        '})',
        'export class A {}'
    ].join('\n'),
    'src/theme.css': '.p-button { color: red; }\n.p-datatable .p-datatable-thead { top: 0; }\n',
    'src/theme.scss': '.p-dialog { &.p-dialog-maximized { width: 100%; } }\n'
};

function gitProject() {
    const dir = mkdtempSync(join(tmpdir(), 'pinv-'));
    for (const [rel, contents] of Object.entries(FILES)) {
        const full = join(dir, rel);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, contents);
    }
    const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
    g('init', '-q');
    g('config', 'user.email', 't@e.com');
    g('config', 'user.name', 'T');
    g('add', '-A');
    g('commit', '-qm', 'base');
    return dir;
}

test('the number of .p-* class strings is IDENTICAL before and after a write', () => {
    const dir = gitProject();
    try {
        const before = countPClasses(dir);
        assert.ok(before > 0, 'the fixture must actually contain .p-* classes');
        execFileSync(process.execPath, [BIN, dir, '--write'], { encoding: 'utf8' });
        assert.equal(countPClasses(dir), before, '.p-* class strings must not change in number');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('stylesheets are byte-identical after a write', () => {
    const dir = gitProject();
    try {
        execFileSync(process.execPath, [BIN, dir, '--write'], { encoding: 'utf8' });
        assert.equal(readFileSync(join(dir, 'src/theme.css'), 'utf8'), FILES['src/theme.css']);
        assert.equal(readFileSync(join(dir, 'src/theme.scss'), 'utf8'), FILES['src/theme.scss']);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a class attribute keeps its p-button value while the TAG is renamed', () => {
    // The same token, two roles, one line: <p-button class="p-button p-button-lg">. Only the
    // tag moves. This single line is the whole reason matching is positional.
    const dir = gitProject();
    try {
        execFileSync(process.execPath, [BIN, dir, '--write'], { encoding: 'utf8' });
        const html = readFileSync(join(dir, 'src/app.html'), 'utf8');
        assert.match(html, /<agl-button class="p-button p-button-lg"><\/agl-button>/);
        assert.doesNotMatch(html, /agl-button-lg/, 'a class value must never be rewritten');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('a styles block inside a component is left alone while its template is migrated', () => {
    const dir = gitProject();
    try {
        execFileSync(process.execPath, [BIN, dir, '--write'], { encoding: 'utf8' });
        const ts = readFileSync(join(dir, 'src/app.ts'), 'utf8');
        assert.match(ts, /<agl-card>/, 'the inline template must be migrated');
        assert.match(ts, /\.p-card \{ padding: 0; \} \.p-card-body \{ margin: 0; \}/, 'the styles block must not be');
        assert.match(ts, /@anguless\/angulux\/button/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
