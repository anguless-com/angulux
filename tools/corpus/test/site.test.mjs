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
