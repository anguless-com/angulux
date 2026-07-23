import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { ELEMENTS, ATTRIBUTES, IMPORT_FROM, IMPORT_TO } from './selector-map.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.angular', 'coverage', '.next', 'out']);
const TEMPLATE_EXT = new Set(['.html', '.htm']);
const CODE_EXT = new Set(['.ts', '.js', '.mjs', '.tsx', '.jsx']);

function* walk(dir, root = dir) {
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return;
    }
    for (const name of entries) {
        if (SKIP_DIRS.has(name)) continue;
        const full = join(dir, name);
        let st;
        try {
            st = statSync(full);
        } catch {
            continue;
        }
        if (st.isDirectory()) yield* walk(full, root);
        else yield full;
    }
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/**
 * Element selectors, matched ONLY in tag position.
 *
 * The `<` or `</` anchor is what keeps `.p-button` in a stylesheet — or in a `styles: []`
 * block inside a component — from being mistaken for a selector. The fork deliberately kept
 * every `.p-*` CSS class name so themes keep working, so rewriting one would break a
 * consumer's styling in a way nothing would report.
 */
const ELEMENT_RX = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g;

/**
 * Attribute selectors, matched only where an attribute can appear: after whitespace, and
 * optionally wrapped in Angular's binding brackets. `pButton`, `[pTooltip]`, `(pSomething)`.
 * The trailing boundary stops `pButton` from matching inside `pButtonish`.
 */
const ATTRIBUTE_RX = /(?<=\s)[[(]?([a-zA-Z][a-zA-Z0-9]*)[\])]?(?=[\s=>\]/])/g;

/** `from 'primeng'` / `from "primeng/table"` — the quoted specifier, not any mention. */
const IMPORT_RX = /(['"])(primeng(?:\/[a-zA-Z0-9._-]+)*)\1/g;

function scanTemplate(text, file, findings) {
    for (const m of text.matchAll(ELEMENT_RX)) {
        const to = ELEMENTS[m[1]];
        if (to) findings.push({ category: 'element', file, line: lineOf(text, m.index), from: m[1], to });
    }
    for (const m of text.matchAll(ATTRIBUTE_RX)) {
        const to = ATTRIBUTES[m[1]];
        if (to) findings.push({ category: 'attribute', file, line: lineOf(text, m.index), from: m[1], to });
    }
}

/**
 * Everything migrating a project to angulux would change, with nothing changed.
 *
 * Matching is by POSITION and against an ALLOWLIST — never a `p-` → `agl-` pattern. Both
 * properties matter: position keeps CSS classes out of it, and the allowlist keeps a
 * project's own `<p-widget>` out of it.
 *
 * @returns {Array<{category: string, file: string, line?: number, from: string, to: string}>}
 */
export function scan(projectRoot) {
    const findings = [];

    const pkgPath = join(projectRoot, 'package.json');
    if (existsSync(pkgPath)) {
        const text = readFileSync(pkgPath, 'utf8');
        let pkg;
        try {
            pkg = JSON.parse(text);
        } catch {
            pkg = null;
        }
        if (pkg) {
            for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
                if (pkg[field]?.[IMPORT_FROM]) {
                    const idx = text.indexOf(`"${IMPORT_FROM}"`);
                    findings.push({
                        category: 'dependency',
                        file: relative(projectRoot, pkgPath),
                        line: idx >= 0 ? lineOf(text, idx) : 1,
                        from: IMPORT_FROM,
                        to: IMPORT_TO
                    });
                }
            }
        }
    }

    for (const full of walk(projectRoot)) {
        const ext = extname(full);
        const file = relative(projectRoot, full);
        if (file === 'package.json') continue;

        // Stylesheets are never read. `.p-*` class names are unchanged by the fork, so there
        // is nothing here to migrate and everything here to get wrong.
        if (!TEMPLATE_EXT.has(ext) && !CODE_EXT.has(ext)) continue;

        let text;
        try {
            text = readFileSync(full, 'utf8');
        } catch {
            continue;
        }

        if (CODE_EXT.has(ext)) {
            for (const m of text.matchAll(IMPORT_RX)) {
                findings.push({
                    category: 'import',
                    file,
                    line: lineOf(text, m.index),
                    from: m[2],
                    to: m[2].replace(IMPORT_FROM, IMPORT_TO)
                });
            }
        }

        // Templates live in .html files and in `template:` blocks inside components; both
        // are scanned the same way, because the same selectors appear in both.
        scanTemplate(text, file, findings);
    }

    return findings;
}
