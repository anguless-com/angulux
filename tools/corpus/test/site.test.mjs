import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSite, renderModulePage } from '../render-llms.mjs';
import { buildCorpus } from '../generate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const closure = JSON.parse(readFileSync(resolve(repoRoot, 'tools/scope/closure.json'), 'utf8')).closure;

const corpus = buildCorpus();
const site = renderSite(corpus);

test('the site is llms.txt, llms-full.txt and exactly one page per warranted module', () => {
    const pages = [...site.keys()].filter((p) => p.endsWith('.md'));

    assert.equal(pages.length, 64);
    assert.deepEqual(pages.map((p) => p.replace(/\.md$/, '')).sort(), [...closure].sort());
    assert.ok(site.has('llms.txt'));
    assert.ok(site.has('llms-full.txt'));
});

test('no page exists for an attic module', () => {
    // The 53 out-of-scope modules are unsupported. A page for one would advertise a surface
    // the project does not warrant, and an assistant cannot tell the difference.
    for (const path of site.keys()) {
        const name = path.replace(/\.md$/, '');
        if (path.endsWith('.md')) assert.ok(closure.includes(name), `${name} is not warranted`);
    }
});

test('no page is empty, including the modules that declare nothing', () => {
    for (const [path, contents] of site) {
        assert.ok(contents.trim().length > 0, `${path} is empty`);
        assert.match(contents, /^# /, `${path} does not start with an H1`);
    }
});

test('a module with no declarations says so, rather than rendering a blank page', () => {
    const empty = corpus.modules.find((m) => m.declarations.length === 0);
    const page = renderModulePage(empty);

    assert.match(page, /declares no component or directive/);
});

test('an undeclared default reads as not documented, never as a blank cell', () => {
    // A blank cell reads as "there is no default". The truth for ~90% of inputs is "nobody
    // wrote one down", and those are different claims.
    const button = corpus.modules.find((m) => m.name === 'button');
    const page = renderModulePage(button);

    assert.match(page, /_not documented_/);
});

test('a deprecated input is marked on the page a reader actually lands on', () => {
    const button = corpus.modules.find((m) => m.name === 'button');
    assert.match(renderModulePage(button), /\*\*Deprecated:\*\* use aglButtonLabel directive instead\./);
});

test('a type containing a pipe cannot break the table it sits in', () => {
    // "'small' | 'large' | undefined" is a real type in this library and an unescaped pipe
    // would silently split the row into extra columns.
    const button = corpus.modules.find((m) => m.name === 'button');
    const rows = renderModulePage(button)
        .split('\n')
        .filter((line) => line.startsWith('| `'));

    assert.ok(rows.length > 0);
    for (const row of rows) {
        const columns = row.split(/(?<!\\)\|/).length - 2;
        assert.ok(columns === 4 || columns === 3, `row has ${columns} columns: ${row}`);
    }
});

test('every page shows the import specifier that actually resolves', () => {
    for (const module of corpus.modules) {
        assert.match(renderModulePage(module), /from '@anguless\/angulux\//);
    }
});

test('llms-full.txt contains every module', () => {
    const full = site.get('llms-full.txt');
    for (const module of corpus.modules) assert.ok(full.includes(`# ${module.name}\n`), `${module.name} missing`);
});

test('every rendered file is LF-only', () => {
    for (const [path, contents] of site) assert.doesNotMatch(contents, /\r/, `${path} contains CR`);
});

/**
 * Count the LIVE delimiters in a table row, the way a markdown parser does: walk left to
 * right, and let a backslash consume the character after it.
 *
 * A one-character lookbehind is not good enough and that matters here — `a\\|b` has an
 * escaped backslash followed by a REAL delimiter, but `/(?<!\\)\|/` sees the backslash
 * immediately before the pipe and wrongly concludes it is escaped. That naive check passed
 * against the very bug CodeQL reported, which is how a test can confirm a defect instead of
 * catching it.
 */
function liveDelimiters(row) {
    let count = 0;
    for (let i = 0; i < row.length; i += 1) {
        if (row[i] === '\\') {
            i += 1;
            continue;
        }
        if (row[i] === '|') count += 1;
    }
    return count;
}

test('a value containing a backslash cannot smuggle a live delimiter into a row', () => {
    // CodeQL js/incomplete-sanitization, high, caught on PR #93. Escaping only the pipe turns
    // `a\|b` into `a\\|b` — an escaped backslash followed by a live delimiter — so the row
    // gains a column. No corpus value contains a backslash today, but that is a fact about
    // the data, not about the function, and the data is regenerated from editable source.
    const BACKSLASH = String.fromCharCode(92);
    const hostile = {
        name: 'evil',
        entrypoint: '@anguless/angulux/evil',
        description: '',
        declarations: [
            {
                name: 'Evil',
                kind: 'component',
                selector: 'agl-evil',
                inputs: [
                    {
                        // A backslash IMMEDIATELY before a pipe — the only arrangement that
                        // exercises the flaw.
                        name: 'x',
                        type: `a${BACKSLASH}|b`,
                        description: `trailing ${BACKSLASH}`,
                        group: null,
                        default: null,
                        defaultDeclared: false,
                        deprecated: null,
                        signal: false
                    }
                ],
                outputs: []
            }
        ]
    };

    const rows = renderModulePage(hostile)
        .split('\n')
        .filter((line) => line.startsWith('| `'));

    assert.equal(rows.length, 1);
    // 5 live delimiters bound 4 columns.
    assert.equal(liveDelimiters(rows[0]), 5, `row broke into extra columns: ${rows[0]}`);
});
