import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSite, renderModulePage, renderIndexHtml, renderMigratePage, BASE_URL } from '../render-llms.mjs';
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
        // The markdown corpus starts with an H1. index.html and robots.txt are not markdown
        // and are asserted on their own terms below.
        const markdown = path.endsWith('.md') || path === 'llms.txt' || path === 'llms-full.txt';
        if (markdown) assert.match(contents, /^# /, `${path} does not start with an H1`);
    }
});

test('the root is a page, not a 404', () => {
    // It was a 404 until this existed, which is what anyone gets when they trim a URL back to
    // its host to check whether the site is real.
    const index = site.get('index.html');

    assert.ok(index, 'no index.html');
    assert.match(index, /^<!doctype html>/i);
    assert.match(index, /<title>[^<]*Angulux/);
});

test('/llms serves the same page as the root', () => {
    // Other libraries publish machine-facing docs under /llms and that is the address people
    // try. Serving it costs one duplicated file and saves a 404 for a reasonable guess.
    assert.equal(site.get('llms/index.html'), site.get('index.html'));
});

test('the landing page links every file it advertises, absolutely', () => {
    const index = site.get('index.html');

    for (const file of ['llms.txt', 'llms-full.txt', 'button.md']) {
        assert.ok(index.includes(`${BASE_URL}${file}`), `index.html does not link ${file}`);
    }
});

test('the landing page counts modules from the corpus rather than a typed-in number', () => {
    // A hand-typed count is a number that starts drifting the day it is written.
    const index = renderIndexHtml({ ...corpus, modules: corpus.modules.slice(0, 3) });

    assert.ok(index.includes('3 supported modules'), 'the summary did not follow the corpus');
    assert.ok(!index.includes('64 supported modules'));
});

test('the landing page renders markdown backticks as code, not as grave accents', () => {
    // The summary is shared with llms.txt and is written in markdown. Dropped into HTML
    // unchanged it renders `agl-*` as a word with grave accents around it — caught by looking
    // at the page, not by any assertion that existed before it.
    const index = site.get('index.html');
    const lede = index.slice(index.indexOf('class="lede"'), index.indexOf('</p>'));

    assert.ok(!lede.includes('`'), 'a raw backtick survived into the rendered lede');
    assert.ok(lede.includes('<code>agl-*</code>'));
});

test('a hostile corpus value cannot inject markup into the landing page', () => {
    const hostile = {
        modules: [
            {
                name: '<script>alert(1)</script>',
                entrypoint: '@anguless/angulux/x',
                description: '',
                declarations: []
            }
        ]
    };

    assert.ok(!renderIndexHtml(hostile).includes('<script>alert(1)</script>'));
});

test('the page declares a favicon, so a visit does not log a 404 for one', () => {
    // Browsers request /favicon.ico unprompted unless the page names one.
    const index = site.get('index.html');

    assert.ok(site.has('favicon.svg'), 'no favicon.svg');
    assert.ok(index.includes(`${BASE_URL}favicon.svg`), 'index.html does not declare the favicon');
    assert.match(site.get('favicon.svg'), /^<svg /);
});

test('the CNAME names exactly the host every generated link points at', () => {
    // A CNAME naming one host while 65 files link to another is invisible until something
    // 404s, so it is derived rather than typed.
    const cname = site.get('CNAME');

    assert.ok(cname, 'no CNAME in the artifact');
    assert.equal(cname.trim(), new URL(BASE_URL).hostname);
    assert.ok(!cname.includes('/'), 'CNAME must be a bare hostname, not a URL');
    assert.ok(!cname.includes(':'), 'CNAME must not carry a scheme or port');
});

test('llms.txt is served from a host ROOT, not a project subpath', () => {
    // The whole reason for the custom domain: assistants probe https://<host>/llms.txt.
    // A path segment before the filename puts it where nothing looks by convention.
    assert.equal(new URL(BASE_URL).pathname, '/');
});

test('robots.txt allows the crawlers this deployment exists for', () => {
    const robots = site.get('robots.txt');

    assert.match(robots, /^User-agent: \*$/m);
    assert.match(robots, /^Allow: \/$/m);
    assert.ok(robots.includes(`${BASE_URL}llms.txt`));
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

test('a slot is printed as the markup that fills it, not as the field that reads it', () => {
    // A page saying `loadingIconTemplate` is accurate about the class and useless about the
    // markup: nobody can type that anywhere. The only string that binds is `#loadingicon`, and
    // getting it wrong fails silently — Angular matches reference names exactly and says
    // nothing when one misses.
    const page = renderModulePage(corpus.modules.find((m) => m.name === 'button'));

    assert.match(page, /<ng-template #loadingicon>/);
    assert.match(page, /\| Slot \| Read as \| Description \|/);
});

test('the index states the one way a slot is filled, since the retired ways fail silently', () => {
    // `pTemplate="header"` is a plain static attribute with nothing to match it: no error, no
    // warning, an empty slot. A reader who never learns that spends the debugging session
    // looking at the component instead of at their own markup.
    assert.match(site.get('llms.txt'), /<ng-template #name>/);
    assert.match(site.get('llms.txt'), /191 template slots/);
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
    for (const module of corpus.modules.filter((m) => m.entrypoint)) {
        assert.match(renderModulePage(module), /from '@anguless\/angulux\//);
    }
});

test('a module has an entry point if and only if it has an ng-package.json', () => {
    // ng-packagr emits a secondary entry point for each directory carrying one. This is the
    // rule the corpus must follow rather than assume: it was assumed, and it was wrong for
    // `types`, whose page advertised an import that throws ERR_PACKAGE_PATH_NOT_EXPORTED in
    // any real install. Checked in both directions so neither a missing nor an invented entry
    // point can pass.
    for (const module of corpus.modules) {
        const declared = existsSync(resolve(repoRoot, 'packages/angulux/src', module.name, 'ng-package.json'));
        assert.equal(
            module.entrypoint !== null,
            declared,
            `${module.name}: entrypoint=${JSON.stringify(module.entrypoint)} but ng-package.json ${declared ? 'exists' : 'does not exist'}`
        );
    }
});

test('a module with no entry point says so instead of printing a broken import', () => {
    const orphan = corpus.modules.find((m) => m.entrypoint === null);

    assert.ok(orphan, 'expected at least one module without an entry point (types)');
    const page = renderModulePage(orphan);

    assert.ok(!page.includes(`from '@anguless/angulux/${orphan.name}'`), 'printed the import that does not resolve');
    assert.match(page, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
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
                outputs: [],
                // The slot table is newer than the escaping fix, so it gets the same hostile
                // value rather than being trusted to have inherited the lesson.
                slots: [
                    {
                        name: 'evilslot',
                        field: 'evilTemplate',
                        description: `trailing ${BACKSLASH}`,
                        deprecated: null
                    }
                ]
            }
        ]
    };

    const rows = renderModulePage(hostile)
        .split('\n')
        .filter((line) => line.startsWith('| `'));

    assert.equal(rows.length, 2);
    // 5 live delimiters bound the input row's 4 columns; the slot row has 3.
    assert.equal(liveDelimiters(rows[0]), 5, `input row broke into extra columns: ${rows[0]}`);
    assert.equal(liveDelimiters(rows[1]), 4, `slot row broke into extra columns: ${rows[1]}`);
});

test('the migration page is served at an extensionless address', () => {
    // It is the one URL meant to be pasted into a forum reply. A directory index gives
    // `/primeng-21-to-angular-22`; a flat `.html` would put the tooling in the shared link.
    const page = site.get('primeng-21-to-angular-22/index.html');

    assert.ok(page, 'no migration page');
    assert.match(page, /^<!doctype html>/i);
    assert.match(page, /<link rel="canonical" href="[^"]*primeng-21-to-angular-22">/);
});

test('the root page links to the migration page', () => {
    // A human who trims the URL back to the host lands on the assistant-facing index. Without
    // this link the page written for them is reachable only by already knowing its address —
    // the same failure the root 404 was, one level down.
    assert.match(renderIndexHtml(corpus), /href="[^"]*primeng-21-to-angular-22"/);
});

test('the migration page still says the peer dependency is the only blocker', () => {
    // The load-bearing honesty of the page. PrimeNG 21 runs on Angular 22 and the install is
    // refused by one peer range, which was MEASURED before this fork existed. A reader who
    // finds that out on their own after the page implied otherwise stops believing all of it,
    // and the rest of the page is the part that matters. If a rewrite ever drops this, the
    // page has become marketing and this test is the thing that says so.
    //
    // SCOPED TO THE SECTION, not to the whole page. A first version asserted these strings
    // anywhere in the document and a mutation proved that worthless: deleting the sentence that
    // hands the reader the escape hatch, and replacing it with "upgrading is the only supported
    // path forward", left the test green — because `--legacy-peer-deps` still appeared in the
    // options table further down. Presence somewhere is not the claim; the claim is that the
    // section explaining the blocker still tells the reader how to route around this project.
    const page = site.get('primeng-21-to-angular-22/index.html');
    const start = page.indexOf('<h2>What is actually blocking the install</h2>');
    const section = page.slice(start, page.indexOf('<h2>', start + 1));

    assert.ok(start >= 0, 'the section explaining the blocker is gone');
    assert.match(section, /peer dependency/i);
    assert.match(section, /--legacy-peer-deps/);
    assert.match(section, /runs on Angular 22/i);
    // The escape hatch must be offered, not merely named in passing.
    assert.match(section, /will unblock you/i);
});

test('the migration page offers the options that are not this project', () => {
    // Three of the four rows must survive any edit: buying a license and rewriting elsewhere
    // are real answers, and a comparison table that omits them is an advert wearing a table.
    const page = site.get('primeng-21-to-angular-22/index.html');

    assert.match(page, /Buy a PrimeNG 22 license/i);
    assert.match(page, /Rewrite onto another component library/i);
});

test('the migration page counts modules from the corpus, never by hand', () => {
    // Same rule as every other generated page: a hand-typed count is a number that starts
    // drifting the day it is written. 117 is the exception and is allowed to be a literal only
    // because 21.1.9 is frozen for ever — so the unported count must be the difference, and a
    // corpus that grew by one module must move both numbers on the page.
    const grown = { ...corpus, modules: [...corpus.modules, { ...corpus.modules[0], name: 'zzz-extra' }] };

    const before = site.get('primeng-21-to-angular-22/index.html');
    const after = renderMigratePage(grown);

    assert.match(before, new RegExp(`${corpus.modules.length} of PrimeNG's 117 modules`));
    assert.match(after, new RegExp(`${corpus.modules.length + 1} of PrimeNG's 117 modules`));
    // 117 - 64 = 53 unported; one more shipped module means one fewer unported.
    // String.raw, because `\b` inside a plain template literal is a BACKSPACE character, not a
    // word boundary — the regex then cannot match anything and the test fails for a reason that
    // has nothing to do with the page. Caught exactly that way while writing this.
    assert.match(before, new RegExp(String.raw`\b${117 - corpus.modules.length}\b`));
    assert.match(after, new RegExp(String.raw`\b${117 - corpus.modules.length - 1}\b`));
});

test('the migration page never claims feature parity', () => {
    // The project ships 64 of 117 modules. "Drop-in replacement" and friends are the exact
    // phrases that would turn an honest page into a support burden, so they are banned outright
    // rather than left to whoever edits this next.
    const page = site.get('primeng-21-to-angular-22/index.html');

    for (const phrase of [/drop-in replacement/i, /feature parity/i, /100% compatible/i, /fully compatible/i]) {
        assert.doesNotMatch(page, phrase);
    }
});
