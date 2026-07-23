import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELEMENTS, ATTRIBUTES, IMPORT_FROM, IMPORT_TO } from './selector-map.mjs';

/**
 * Can we safely write here?
 *
 * The only guarantee this tool offers about a rewrite is that you can throw it away. That
 * requires a repository (something to revert to) and a clean tree (nothing of yours to lose).
 * There is deliberately no flag to bypass this: an escape hatch on a safety property is the
 * safety property being optional.
 */
export function checkWritable(projectRoot) {
    let inside;
    try {
        inside = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
            cwd: projectRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
    } catch {
        inside = '';
    }
    if (inside !== 'true') {
        return {
            ok: false,
            reason:
                'not inside a git work tree — there would be no way to undo this. ' +
                'Initialise a repository and commit your work first.'
        };
    }

    const status = execFileSync('git', ['status', '--porcelain'], {
        cwd: projectRoot,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024
    }).trim();

    if (status) {
        return {
            ok: false,
            reason:
                'the working tree has uncommitted changes. Commit or stash them first, so that ' +
                'everything this writes can be reverted with a single `git checkout -- .`'
        };
    }
    return { ok: true };
}

/** Longest first, so `p-avatar-group` is never half-matched by `p-avatar`. */
const ELEMENT_NAMES = Object.keys(ELEMENTS).sort((a, b) => b.length - a.length);
const ATTRIBUTE_NAMES = Object.keys(ATTRIBUTES).sort((a, b) => b.length - a.length);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Rewrite one file's text. Positional, exactly as the scanner matches:
 *  - element names only after `<` or `</`
 *  - attribute names only where an attribute can appear
 *  - import specifiers only inside quotes
 *
 * A `.p-button` in a stylesheet or a `styles:` block matches none of these, which is what
 * keeps the fork's promise that CSS class names are untouched.
 */
export function rewriteText(text, { code = false } = {}) {
    let out = text;

    if (code) {
        out = out.replace(
            new RegExp(`(['"])(${escape(IMPORT_FROM)}(?:\\/[a-zA-Z0-9._-]+)*)\\1`, 'g'),
            (_m, q, spec) => `${q}${spec.replace(IMPORT_FROM, IMPORT_TO)}${q}`
        );
    }

    for (const name of ELEMENT_NAMES) {
        out = out.replaceAll(`<${name}`, `<${ELEMENTS[name]}`);
        out = out.replaceAll(`</${name}>`, `</${ELEMENTS[name]}>`);
    }

    for (const name of ATTRIBUTE_NAMES) {
        out = out.replace(
            new RegExp(`(?<=\\s)([[(]?)${escape(name)}([\\])]?)(?=[\\s=>\\]/])`, 'g'),
            (_m, open, close) => `${open}${ATTRIBUTES[name]}${close}`
        );
    }

    return out;
}

/** Rewrite the dependency key in package.json, preserving formatting elsewhere. */
export function rewriteManifest(text) {
    return text.replace(new RegExp(`"${escape(IMPORT_FROM)}"(\\s*):`, 'g'), `"${IMPORT_TO}"$1:`);
}

/**
 * Apply the migration.
 *
 * @returns {{filesChanged: number, edits: number}}
 */
export function apply(projectRoot, findings) {
    const byFile = new Map();
    for (const f of findings) {
        if (!byFile.has(f.file)) byFile.set(f.file, []);
        byFile.get(f.file).push(f);
    }

    let filesChanged = 0;
    let edits = 0;

    for (const [file, group] of byFile) {
        const full = join(projectRoot, file);
        const before = readFileSync(full, 'utf8');
        const isManifest = file === 'package.json';
        const isCode = /\.(ts|js|mjs|tsx|jsx)$/.test(file);
        const after = isManifest ? rewriteManifest(before) : rewriteText(before, { code: isCode });
        if (after !== before) {
            writeFileSync(full, after);
            filesChanged++;
            edits += group.length;
        }
    }

    return { filesChanged, edits };
}
