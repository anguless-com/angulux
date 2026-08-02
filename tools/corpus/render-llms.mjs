/**
 * render-llms — turn the corpus into the files an assistant actually fetches.
 *
 * WHAT THE SPEC ACTUALLY SAYS. llmstxt.org defines ONE file, `llms.txt`: an H1 (the only
 * required section), a blockquote summary, optional prose containing no headings, then
 * H2-delimited sections whose bodies are markdown lists of `[name](url)` links. That is the
 * whole format.
 *
 * `llms-full.txt` is NOT in the specification. It is a de-facto convention other vendors
 * ship and assistants look for, so we serve it too — and say so in the README rather than
 * implying a standard exists. Getting this backwards would mean quietly inventing a rule and
 * then defending it.
 *
 * The spec permits llms.txt at a subpath, which is what made serving from a GitHub Pages
 * project path legal while this had no domain of its own.
 */

/**
 * The canonical base.
 *
 * A HOST ROOT, not a project subpath, and that is the point of moving here. Assistants and
 * crawlers probe `https://<host>/llms.txt` by convention; under the old
 * `anguless-com.github.io/angulux/` the file was reachable only by already knowing the path.
 * A subdomain is a host root, so this satisfies the convention exactly as an apex domain
 * would, without buying anything.
 *
 * Changing this rewrites every link in llms.txt and llms-full.txt, which is why it is one
 * constant and not a string repeated 65 times.
 *
 * The old URLs do not break: once a custom domain is set, GitHub 301s
 * `anguless-com.github.io/angulux/*` here. Note that the PATH changes too — the `/angulux/`
 * prefix is dropped — so this is a redirect, not merely a different hostname in front of the
 * same paths. An earlier comment in this file claimed the paths never change; they do.
 */
export const BASE_URL = 'https://angulux.anguless.com/';

const summaryOf = (corpus) => {
    const declarations = corpus.modules.reduce((n, m) => n + m.declarations.length, 0);
    const inputs = corpus.modules.reduce((n, m) => n + m.declarations.reduce((k, d) => k + d.inputs.length, 0), 0);
    const slots = corpus.modules.reduce((n, m) => n + m.declarations.reduce((k, d) => k + d.slots.length, 0), 0);
    const deprecated = corpus.modules.reduce(
        (n, m) => n + m.declarations.reduce((k, d) => k + d.inputs.filter((i) => i.deprecated !== null).length, 0),
        0
    );

    return (
        `Angulux is an Angular 22 UI component library, forked from the last MIT release of ` +
        `PrimeNG (21.1.9). Selectors are \`agl-*\` and entry points are ` +
        `\`@anguless/angulux/<module>\` — ` +
        `code written against PrimeNG's \`p-*\` selectors will not work. This index covers ` +
        `${corpus.modules.length} supported modules, ${declarations} components and directives, ` +
        `${inputs} inputs, of which ${deprecated} are deprecated, and ${slots} template slots — ` +
        `every one of them filled with \`<ng-template #name>\`, never PrimeNG's \`pTemplate=\`. ` +
        `Every page is generated from the library's own source, so an input absent here does not exist.`
    );
};

/**
 * The llms.txt index.
 *
 * Links are absolute: an assistant fetches them with no memory of where the index came from,
 * so a relative path is a broken path.
 */
export function renderLlmsTxt(corpus) {
    const withApi = corpus.modules.filter((m) => m.declarations.length > 0);
    const withoutApi = corpus.modules.filter((m) => m.declarations.length === 0);

    const entry = (module) => {
        const selectors = module.declarations.map((d) => d.selector).filter(Boolean).join(', ');
        return `- [${module.name}](${BASE_URL}${module.name}.md): ${selectors}`;
    };

    const lines = [
        '# Angulux',
        '',
        `> ${summaryOf(corpus)}`,
        '',
        'Import from the module entry point, never from the package root:',
        '`import { Button } from \'@anguless/angulux/button\';`',
        '',
        'Pages marked deprecated on a given input mean the input still works and should not be',
        'used in new code; the page names the replacement.',
        '',
        '## Components and directives',
        '',
        ...withApi.map(entry),
        '',
        '## Full documentation',
        '',
        `- [llms-full.txt](${BASE_URL}llms-full.txt): every module's full API in one file`,
        '',
        '## Optional',
        '',
        ...withoutApi.map(
            (module) =>
                `- [${module.name}](${BASE_URL}${module.name}.md): internal infrastructure, declares no component or directive`
        ),
        ''
    ];

    return lines.join('\n').replace(/\r\n/g, '\n');
}

const table = (rows, headers) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows
];

/**
 * Escape a cell so a value containing `|` cannot break the table it sits in.
 *
 * Backslashes are escaped FIRST, and the order is the whole point. Escaping only the pipe
 * turns the input `a\|b` into `a\\|b`, which markdown reads as an escaped backslash followed
 * by a LIVE delimiter — so the row silently gains a column. CodeQL flags exactly this as
 * js/incomplete-sanitization, and it was right: no type or description in the corpus contains
 * a backslash today, but "no input currently triggers it" is a property of the data, not of
 * the function, and the data is regenerated from source that anyone can edit.
 */
const cell = (value) =>
    String(value)
        .replace(/\\/g, '\\\\')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ');

function renderDeclaration(declaration) {
    const lines = [`## ${declaration.name}`, '', `\`${declaration.selector}\` — ${declaration.kind}`, ''];

    if (declaration.description) lines.push(declaration.description, '');

    if (declaration.inputs.length) {
        lines.push(
            ...table(
                declaration.inputs.map((input) => {
                    // "not documented" rather than a blank or an invented value: only ~10% of
                    // inputs declare @defaultValue, and a blank cell reads as "no default"
                    // when the truth is "nobody wrote one down".
                    const dflt = input.defaultDeclared ? `\`${cell(input.default)}\`` : '_not documented_';
                    const note = input.deprecated ? ` **Deprecated:** ${cell(input.deprecated)}` : '';
                    return `| \`${cell(input.name)}\` | \`${cell(input.type)}\` | ${dflt} | ${cell(input.description)}${note} |`;
                }),
                ['Input', 'Type', 'Default', 'Description']
            ),
            ''
        );
    }

    if (declaration.outputs.length) {
        lines.push(
            ...table(
                declaration.outputs.map(
                    (output) => `| \`${cell(output.name)}\` | \`${cell(output.type)}\` | ${cell(output.description)} |`
                ),
                ['Output', 'Type', 'Description']
            ),
            ''
        );
    }

    if (declaration.slots.length) {
        // Printed as the markup a caller writes, not as the field name. Angulux fills a slot
        // exactly one way since BL-35, and PrimeNG's two retired ways — `pTemplate="header"`
        // and `<p-header>` — both fail SILENTLY here: an unmatched template attribute renders
        // an empty slot with no error at build time or runtime. A page that listed
        // `headerTemplate` would be accurate about the class and useless about the markup.
        lines.push(
            ...table(
                declaration.slots.map((slot) => {
                    const note = slot.deprecated ? ` **Deprecated:** ${cell(slot.deprecated)}` : '';
                    return `| \`<ng-template #${cell(slot.name)}>\` | \`${cell(slot.field)}\` | ${cell(slot.description)}${note} |`;
                }),
                ['Slot', 'Read as', 'Description']
            ),
            ''
        );
    }

    return lines;
}

/** One module's page. Also the body reused verbatim inside llms-full.txt. */
export function renderModulePage(module) {
    // No entry point means there is nothing importable to show. Printing the template anyway
    // is how `@anguless/angulux/types` came to be advertised on a page while throwing
    // ERR_PACKAGE_PATH_NOT_EXPORTED in any real install — a copyable code block is the most
    // trusted thing on the page, so a false one is worse than none.
    const lines = module.entrypoint
        ? [`# ${module.name}`, '', '```ts', `import { … } from '${module.entrypoint}';`, '```', '']
        : [
              `# ${module.name}`,
              '',
              `**There is no \`@anguless/angulux/${module.name}\` import path.** This directory is a`,
              `namespace rather than an entry point: its contents are imported one level down, as`,
              `\`@anguless/angulux/${module.name}/<name>\`. Importing the bare path fails with`,
              '`ERR_PACKAGE_PATH_NOT_EXPORTED`.',
              ''
          ];

    if (module.declarations.length === 0) {
        lines.push(
            'This module declares no component or directive. It is internal infrastructure that other',
            'modules depend on, and there is nothing here to use directly.',
            ''
        );
        return lines.join('\n');
    }

    for (const declaration of module.declarations) lines.push(...renderDeclaration(declaration));
    return lines.join('\n');
}

/**
 * Everything in one file — the convention assistants look for when they would rather make
 * one request than sixty-five.
 */
export function renderLlmsFullTxt(corpus) {
    return ['# Angulux — full API', '', `> ${summaryOf(corpus)}`, '', ...corpus.modules.map((m) => renderModulePage(m))]
        .join('\n')
        .replace(/\r\n/g, '\n');
}

/** Escape text bound for HTML. The corpus holds selectors and types, which contain `<` and `&`. */
const html = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/**
 * The shared summary is written as markdown, because llms.txt is markdown. Dropped into HTML
 * unchanged it renders its backticks literally — `agl-*` shows up as a word with grave accents
 * around it, on the one page a human is expected to read.
 *
 * Escaping happens FIRST so a corpus value can never open a tag; only then are the backtick
 * spans turned into the one element this introduces.
 */
const inlineCode = (value) => html(value).replace(/`([^`]+)`/g, '<code>$1</code>');

/**
 * The landing page.
 *
 * WHY AN HTML PAGE AT ALL, when the whole point of this deployment is plain text. Because the
 * root was a 404, and a 404 is what both a human and a crawler get when they trim a URL back
 * to its host — the single most common way anyone checks whether a docs site is real. The
 * text files were reachable only by knowing their exact names beforehand.
 *
 * Its numbers come from the corpus for the same reason every other page's do: a hand-typed
 * count is a number that starts drifting the day it is written.
 *
 * It is deliberately one file with inline styles and no script. GitHub Pages serves this
 * directory as-is, so anything needing a build step here would be a second build system living
 * next to the one that already works.
 */
export function renderIndexHtml(corpus) {
    // The newlines below come from this file's own bytes, so a CRLF checkout would emit CRLF
    // here even though every other renderer is LF-only. Normalised on the way out, like they are.
    const declarations = corpus.modules.reduce((n, m) => n + m.declarations.length, 0);
    const inputs = corpus.modules.reduce((n, m) => n + m.declarations.reduce((k, d) => k + d.inputs.length, 0), 0);

    const rows = [
        ['llms.txt', 'the index, in the llms.txt format', 'llms.txt'],
        ['llms-full.txt', `every module's API in one file`, 'llms-full.txt'],
        [`&lt;module&gt;.md`, `one page per module, ${corpus.modules.length} of them`, 'button.md']
    ]
        .map(
            ([name, what, href]) =>
                `<tr><td><a href="${html(BASE_URL)}${html(href)}"><code>${name}</code></a></td><td>${what}</td></tr>`
        )
        .join('\n            ');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Angulux — documentation for AI assistants</title>
<meta name="description" content="Machine-readable API documentation for Angulux, an Angular 22 UI component library forked from the last MIT release of PrimeNG.">
<link rel="canonical" href="${html(BASE_URL)}">
<link rel="icon" href="${html(BASE_URL)}favicon.svg" type="image/svg+xml">
<style>
:root { color-scheme: light dark; }
body { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1.25rem 5rem;
       font: 16px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif; }
h1 { font-size: 1.9rem; margin: 0 0 .35rem; }
h2 { font-size: 1.15rem; margin: 2.25rem 0 .6rem; }
.lede { color: #555; margin: 0 0 1.75rem; }
table { border-collapse: collapse; width: 100%; margin: .5rem 0 1rem; }
th, td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid #8883; vertical-align: top; }
code, pre { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .875em; }
pre { background: #8881; padding: .8rem 1rem; border-radius: 6px; overflow-x: auto; }
footer { margin-top: 3rem; font-size: .875rem; color: #666; }
@media (prefers-color-scheme: dark) { .lede, footer { color: #aaa; } }
</style>
</head>
<body>
<h1>Angulux</h1>
<p class="lede">${inlineCode(summaryOf(corpus))}</p>

<p>Arrived here as a person rather than a crawler, because PrimeNG 22 is no longer MIT?
Read <a href="${html(BASE_URL)}primeng-21-to-angular-22">PrimeNG 21 on Angular 22, without a
license</a> instead — this page is written for assistants.</p>

<h2>Files</h2>
<table>
    <thead><tr><th>URL</th><th>What it is</th></tr></thead>
    <tbody>
            ${rows}
    </tbody>
</table>

<h2>Install</h2>
<pre><code>npm i @anguless/angulux</code></pre>
<p>Import from the module entry point, never from the package root:</p>
<pre><code>import { Button } from '@anguless/angulux/button';</code></pre>

<h2>Why this exists</h2>
<p>Angulux is new, so no model has seen it. Ask an assistant about it and it answers with
PrimeNG's <code>p-*</code> API, because that is the only thing in its training data. Angulux
uses <code>agl-*</code>, and ${inputs} inputs across ${declarations} components and directives
differ in ways a confident guess gets wrong.</p>
<p>Every page here is generated from the library's own TypeScript. Nothing is hand-written, so
an input absent here does not exist.</p>

<h2>MCP</h2>
<p>An assistant that speaks MCP can query the same corpus instead of fetching pages. See the
<a href="https://github.com/anguless-com/angulux#for-assistants-that-speak-mcp">repository</a>.</p>

<footer>
<a href="https://github.com/anguless-com/angulux">Source</a> · MIT ·
forked from PrimeNG 21.1.9, the last MIT release
</footer>
</body>
</html>
`.replace(/\r\n/g, '\n');
}

/**
 * The number of module directories in PrimeNG 21.1.9.
 *
 * Safe to hold as a literal precisely because 21.1.9 is frozen: it is the last MIT release and
 * no further one will ever be cut, so this count cannot drift the way a number describing
 * living code would. Everything else on the migration page is derived from the corpus, and the
 * count of unported modules is derived from this minus that — never typed twice.
 */
const UPSTREAM_MODULE_COUNT = 117;

/**
 * The migration page — the one page written for a person rather than an assistant.
 *
 * WHY IT IS SEPARATE from the root. The root page answers "what is the API", to a model that
 * has never seen this library. This one answers "PrimeNG 22 is not MIT any more, now what",
 * to a developer whose `ng update` just stopped. Same project, different question, and merging
 * them would serve neither: the assistant page would gain sales copy and this one would open
 * with a table of file formats.
 *
 * WHY IT ARGUES AGAINST ITSELF. Four of the five options in the table are not angulux, and the
 * blocker is described as the one line it actually is. A reader who discovers on their own that
 * `--legacy-peer-deps` would have worked stops believing the rest of the page, and the rest of
 * the page is the part that matters. The honest version is also the more persuasive one.
 *
 * WHY IT NAMES A LARGER RIVAL AND SENDS READERS THERE FIRST. OpenNG's optimus-ui is the bigger
 * MIT continuation of PrimeNG 21 and was already well known in the Angular community before
 * this page existed — a first draft omitted it and thereby implied angulux was *the* community
 * fork, which is false. Anyone comparing options finds OpenNG within one search, so the only
 * question is whether they find it here or discover this page hid it.
 *
 * NO RIVAL STATISTICS ANYWHERE IN THIS PAGE. Star counts, contributor counts and peer ranges all
 * move, and a generated page that quotes them is wrong on a delay, silently, with nobody having
 * touched it — the same failure mode as any hand-typed count. So the comparison is stated only
 * in terms that stay true (more contributors, larger surface, foundation-shaped) and the reader
 * is handed the two `npm view` commands to check the volatile part themselves.
 */
export function renderMigratePage(corpus) {
    const declarations = corpus.modules.reduce((n, m) => n + m.declarations.length, 0);
    const unported = UPSTREAM_MODULE_COUNT - corpus.modules.length;

    const options = [
        [
            `Install PrimeNG 21 anyway, with <code>--legacy-peer-deps</code>`,
            'Minutes',
            'Nothing today. But you are pinned to a release that will never be patched again, on a framework it was never released for.'
        ],
        ['Buy a PrimeNG 22 license', 'Money, per seat', 'Nothing technical. This is the supported path and it works.'],
        [
            'Rewrite onto another component library',
            'Weeks to months',
            'Every template you have already written, and the theme built around it.'
        ],
        [
            `<a href="https://github.com/openng-org/optimus-ui">OpenNG's optimus-ui</a> — the larger community continuation of PrimeNG 21`,
            'A rename, same as below',
            'Nothing obvious. It has far more contributors than this project and is organised as a maintenance foundation. Look at it before you look at mine.'
        ],
        [
            `Move to angulux`,
            'A codemod run, then fix what it reports',
            `${unported} modules that are not ported, and the <code>p-*</code> element names.`
        ]
    ]
        .map(([what, cost, gives]) => `<tr><td>${what}</td><td>${cost}</td><td>${gives}</td></tr>`)
        .join('\n            ');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PrimeNG 21 on Angular 22, without a license — Angulux</title>
<meta name="description" content="PrimeNG 22 is no longer MIT. What your options actually are if you are on PrimeNG 21 and need Angular 22, including the three that are not Angulux.">
<link rel="canonical" href="${html(BASE_URL)}primeng-21-to-angular-22">
<link rel="icon" href="${html(BASE_URL)}favicon.svg" type="image/svg+xml">
<style>
:root { color-scheme: light dark; }
body { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1.25rem 5rem;
       font: 16px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif; }
h1 { font-size: 1.9rem; margin: 0 0 .35rem; }
h2 { font-size: 1.15rem; margin: 2.25rem 0 .6rem; }
.lede { color: #555; margin: 0 0 1.75rem; }
table { border-collapse: collapse; width: 100%; margin: .5rem 0 1rem; }
th, td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid #8883; vertical-align: top; }
code, pre { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .875em; }
pre { background: #8881; padding: .8rem 1rem; border-radius: 6px; overflow-x: auto; }
footer { margin-top: 3rem; font-size: .875rem; color: #666; }
@media (prefers-color-scheme: dark) { .lede, footer { color: #aaa; } }
</style>
</head>
<body>
<h1>PrimeNG 21 on Angular 22, without a license</h1>
<p class="lede">If <code>ng update</code> to Angular 22 stopped on a PrimeNG peer dependency, this
page is the whole decision — including the three options that are not this project.</p>

<h2>What actually changed</h2>
<p>PrimeNG releases up to and including 21.1.9 are MIT. From 22 they are not. Nothing in your
application stopped working and Angular 22 did not break anything: the license terms of new
releases changed, and that is the entire event.</p>

<h2>What is actually blocking the install</h2>
<p>One line. PrimeNG 21.1.9 declares a peer dependency that does not admit Angular 22, so the
package manager refuses. <strong>The library itself runs on Angular 22</strong> — that was
measured before this fork existed, not assumed. So
<code>npm install --legacy-peer-deps</code> will unblock you this afternoon, on a release that
will never be patched again.</p>
<p>Anyone telling you that you <em>must</em> pay or <em>must</em> migrate is skipping this
paragraph.</p>

<h2>Your options</h2>
<table>
    <thead><tr><th>Option</th><th>Costs</th><th>What you give up</th></tr></thead>
    <tbody>
            ${options}
    </tbody>
</table>

<h2>You should look at OpenNG first</h2>
<p>Angulux is not the only MIT continuation of PrimeNG 21, and it is not the biggest.
<a href="https://github.com/openng-org/optimus-ui">OpenNG's optimus-ui</a> has substantially
more contributors than this project, is organised as a maintenance foundation rather than one
person's fork, and carries more of PrimeNG's component surface. For most teams that is the
better answer, and you should evaluate it before you evaluate this.</p>
<p>The honest difference is scope of ambition. OpenNG is continuing PrimeNG. Angulux warrants a
deliberately smaller surface — ${corpus.modules.length} modules — and spends the surplus on
things that are unusual to find in a fork: a recorded provenance chain for every inherited file,
a build that fails if a post-MIT PrimeTek package enters the dependency tree, and a generated
API corpus that AI assistants can query instead of guessing.</p>
<p>If you want the largest MIT component set, that is not this. If you need to prove to somebody
where the code came from, this project was built around that question from the first commit.</p>
<p><strong>On Angular 22 specifically: check, do not take my word.</strong> Peer ranges move, and
a page claiming a rival does not support something is a page that becomes wrong without anyone
editing it. Run this and believe the output:</p>
<pre><code>npm view @openng/optimus-ui peerDependencies
npm view @anguless/angulux peerDependencies</code></pre>

<h2>What Angulux is</h2>
<p>A fork of PrimeNG 21.1.9 — the last MIT release — brought up on Angular 22 and kept MIT. It
ships ${corpus.modules.length} of PrimeNG's ${UPSTREAM_MODULE_COUNT} modules,
${declarations} components and directives in total. The other ${unported} are kept in the
repository, unported and unpublished, rather than deleted.</p>

<h2>What it costs you, concretely</h2>
<table>
    <thead><tr><th>Changes</th><th>Does not change</th></tr></thead>
    <tbody>
            <tr><td>Element names: <code>p-table</code> → <code>agl-table</code></td><td><strong>CSS class names stay <code>p-*</code></strong> — your theme and every style override survive untouched</td></tr>
            <tr><td>Imports: <code>primeng/table</code> → <code>@anguless/angulux/table</code></td><td>Inputs, outputs and component behaviour — the 22.x API is frozen deliberately</td></tr>
            <tr><td>${unported} modules are not available</td><td>Your existing templates, apart from the renames above</td></tr>
    </tbody>
</table>

<h2>Find out what it would cost you, without committing</h2>
<pre><code>npx angulux-migrate</code></pre>
<p>Reports only. It writes nothing at all unless you pass <code>--write</code>, and
<code>--write</code> refuses to run outside a clean git tree, so there is always something to
revert to.</p>

<h2>For whoever has to sign this off</h2>
<p>The provenance question — <em>can we prove this is lawfully MIT?</em> — is answered in the
repository rather than asserted here: every inherited file's origin is recorded, and a check
that fails the build if a post-MIT PrimeTek package ever enters the dependency tree runs on
every commit.</p>

<h2>Where this project is honest about being weak</h2>
<ul>
<li>It is young, and small. Judge it on the gates and the provenance record, not on a logo wall.</li>
<li>The 22.x API is frozen on purpose. Redesign is queued behind the Angular 23 release.</li>
<li>If you depend on one of the ${unported} unported modules, this is not ready for you today.</li>
</ul>

<h2>Install</h2>
<pre><code>npm i @anguless/angulux</code></pre>
<p>Then <a href="${html(BASE_URL)}">the module index</a> for the API of everything shipped.</p>

<footer>
<a href="https://github.com/anguless-com/angulux">Source</a> · MIT ·
forked from PrimeNG 21.1.9, the last MIT release
</footer>
</body>
</html>
`.replace(/\r\n/g, '\n');
}

/**
 * The favicon, as SVG text rather than a binary .ico.
 *
 * Every browser requests one unprompted, so without it each visit logs a 404 — the same shape
 * of "the site is half there" the root 404 was. SVG keeps this directory free of binaries: the
 * whole deployment stays greppable and diffable, which is the property that lets `check:corpus`
 * mean something.
 */
export function renderFaviconSvg() {
    return [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
        '<rect width="64" height="64" rx="12" fill="#10b981"/>',
        '<text x="32" y="45" font-family="system-ui,sans-serif" font-size="38" font-weight="700"',
        ' fill="#fff" text-anchor="middle">A</text>',
        '</svg>',
        ''
    ].join('\n');
}

/**
 * The CNAME file GitHub Pages reads to serve this deployment on a custom domain.
 *
 * Emitted as part of the artifact rather than left to the repository setting alone. A
 * workflow deploy replaces the whole published tree on every run, so a domain configured
 * only in settings is one deploy away from being dropped — and the failure mode is the live
 * site quietly reverting to the github.io path while every generated link still points at
 * the custom domain.
 *
 * Derived from BASE_URL so the two cannot disagree. A CNAME naming one host while every
 * link names another is exactly the split that would be invisible until something 404s.
 */
export function renderCname() {
    return `${new URL(BASE_URL).hostname}\n`;
}

/**
 * robots.txt.
 *
 * Explicitly allow, rather than rely on the absence of a file meaning yes. Some crawlers treat
 * a missing robots.txt as permission and others treat it as unknown, and this deployment
 * exists precisely to be read by machines.
 */
export function renderRobotsTxt() {
    return ['User-agent: *', 'Allow: /', '', `# The index an assistant wants: ${BASE_URL}llms.txt`, ''].join('\n');
}

/**
 * The whole publishable site as path -> contents. Returned rather than written so the
 * workflow decides where it lands and the tests never touch a filesystem.
 *
 * `llms/index.html` is the same page as the root. Other libraries publish their machine-facing
 * docs under a `/llms` path and that is the address people try; serving it costs one duplicated
 * file and saves a 404 for anyone who guessed the common shape rather than ours.
 */
export function renderSite(corpus) {
    const files = new Map();
    files.set('llms.txt', renderLlmsTxt(corpus));
    files.set('llms-full.txt', renderLlmsFullTxt(corpus));
    for (const module of corpus.modules) files.set(`${module.name}.md`, renderModulePage(module));

    const landing = renderIndexHtml(corpus);
    files.set('index.html', landing);
    files.set('llms/index.html', landing);
    // A directory index, so the address is `/primeng-21-to-angular-22` with no extension —
    // this is the one URL meant to be pasted into a forum reply, and `.html` in a shared link
    // reads as an artefact of the tooling rather than a page someone wrote.
    files.set('primeng-21-to-angular-22/index.html', renderMigratePage(corpus));
    files.set('robots.txt', renderRobotsTxt());
    files.set('favicon.svg', renderFaviconSvg());
    files.set('CNAME', renderCname());
    return files;
}
