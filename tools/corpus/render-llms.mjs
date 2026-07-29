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
 * The spec permits llms.txt at a subpath, which is what makes serving from a GitHub Pages
 * project path legal today and a domain move legal later. The paths do not change when the
 * host does.
 */

/**
 * Canonical base today. When angulux.io is bought it points at the same deployment and
 * GitHub 301s these paths, so nothing an assistant cached goes stale.
 */
export const BASE_URL = 'https://anguless-com.github.io/angulux/';

const summaryOf = (corpus) => {
    const declarations = corpus.modules.reduce((n, m) => n + m.declarations.length, 0);
    const inputs = corpus.modules.reduce((n, m) => n + m.declarations.reduce((k, d) => k + d.inputs.length, 0), 0);
    const deprecated = corpus.modules.reduce(
        (n, m) => n + m.declarations.reduce((k, d) => k + d.inputs.filter((i) => i.deprecated !== null).length, 0),
        0
    );

    return (
        `Angulux is an Angular 22 UI component library, forked from the last MIT release of ` +
        `PrimeNG (21.1.9). Selectors are \`agl-*\` and entry points are \`angulux/<module>\` — ` +
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
