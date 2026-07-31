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
        `${inputs} inputs, of which ${deprecated} are deprecated. Every page is generated from ` +
        `the library's own source, so an input absent here does not exist.`
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

    return lines;
}

/** One module's page. Also the body reused verbatim inside llms-full.txt. */
export function renderModulePage(module) {
    const lines = [`# ${module.name}`, '', `\`\`\`ts`, `import { … } from '${module.entrypoint}';`, '```', ''];

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
    files.set('robots.txt', renderRobotsTxt());
    files.set('favicon.svg', renderFaviconSvg());
    files.set('CNAME', renderCname());
    return files;
}
