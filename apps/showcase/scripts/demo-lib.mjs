/**
 * The pure half of the demo pipeline: how a demo file is found, identified, and cut.
 *
 * It lives apart from `build-demos.mjs` so the GENERATOR and the GATE can share one
 * definition. If the gate re-implemented "what a valid demo looks like", the two would
 * eventually disagree, and the disagreement would surface as a site that builds green and
 * publishes wrong — the exact failure the extraction was introduced to make impossible.
 *
 * Everything here is a pure function of text and paths. No writes, no process, no exit.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A demo file imports the library and nothing of the site. */
export const SHOWCASE_IMPORT_RE = /from '(\.\.\/)+components\//;

/** `button/basic-doc.ts` -> `button-basic`. */
export const demoId = (module, file) => `${module}-${file.replace(/-doc\.ts$/, '')}`;

/**
 * Every `*-doc.ts` under `<docDir>/<module>/`, as `{ id, module, file, path }`.
 *
 * The id is DERIVED from the path, never declared in the file. A declared id can disagree
 * with where it lives; a derived one cannot.
 */
export function collectDemoFiles(docDir, dir = docDir, found = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);

        if (statSync(full).isDirectory()) {
            collectDemoFiles(docDir, full, found);
        } else if (entry.endsWith('-doc.ts')) {
            const module = dir.slice(docDir.length + 1).replace(/\\/g, '/');

            found.push({ id: demoId(module, entry), module, file: entry, path: full });
        }
    }

    return found;
}

/**
 * The text inside the first `<div class="card...">`, dedented.
 *
 * Returns `{ template, error }` rather than throwing, because the generator wants to stop at
 * the first bad file and the gate wants to report all of them. One of the two is always null.
 */
export function extractCard(source) {
    const open = source.indexOf('<div class="card');

    if (open === -1) {
        return { template: null, error: 'no <div class="card"> — the extractor has no boundary to cut on' };
    }

    const bodyStart = source.indexOf('>', open) + 1;
    let depth = 0;
    let cursor = bodyStart;

    while (cursor < source.length) {
        const nextOpen = source.indexOf('<div', cursor);
        const nextClose = source.indexOf('</div>', cursor);

        if (nextClose === -1) {
            return { template: null, error: '<div class="card"> is never closed' };
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            cursor = nextOpen + 4;
        } else if (depth > 0) {
            depth--;
            cursor = nextClose + 6;
        } else {
            const template = dedent(source.slice(bodyStart, nextClose));

            return template.trim() ? { template, error: null } : { template: null, error: 'the card is empty — there is no demo to show' };
        }
    }

    return { template: null, error: '<div class="card"> is never closed' };
}

export function dedent(text) {
    const lines = text.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
    const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length);
    const strip = indents.length ? Math.min(...indents) : 0;

    return lines.map((line) => line.slice(strip)).join('\n');
}

/**
 * The sections declared in `registry.ts`, read as text.
 *
 * Deliberately a regex over source rather than an import: the registry is TypeScript with
 * lazy `import()` calls in it, so evaluating it means running a bundler. What the gate needs
 * is much smaller — the four literals in each entry — and reading them as text keeps the gate
 * free of the app's toolchain.
 *
 * Returns `[{ module, id, label, importPath, exportName }]`.
 */
export function parseRegistry(source) {
    const sections = [];

    // `button: [` … the key whose array follows.
    for (const moduleMatch of source.matchAll(/^\s{4}(['"]?)([\w-]+)\1:\s*\[/gm)) {
        const module = moduleMatch[2];
        const rest = source.slice(moduleMatch.index);
        const end = rest.indexOf('\n    ]');
        const block = end === -1 ? rest : rest.slice(0, end);

        for (const entry of block.matchAll(/id:\s*'([^']+)'[\s\S]*?label:\s*'([^']*)'[\s\S]*?import\('([^']+)'\)\.then\(\(m\) => m\.(\w+)\)/g)) {
            sections.push({ module, id: entry[1], label: entry[2], importPath: entry[3], exportName: entry[4] });
        }
    }

    return sections;
}
