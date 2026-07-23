import { resolve } from 'node:path';
import { scan } from './scan.mjs';

export { scan } from './scan.mjs';
export { ELEMENTS, ATTRIBUTES, IMPORT_FROM, IMPORT_TO } from './selector-map.mjs';

export const EXIT_OK = 0;
export const EXIT_REFUSED = 1;

const CATEGORIES = [
    ['dependency', 'dependency declaration'],
    ['import', 'import path'],
    ['element', 'element selector'],
    ['attribute', 'attribute selector']
];

/**
 * Produce the report for a project. Writes nothing, ever — this function has no filesystem
 * write in it and no code path that acquires one.
 *
 * @returns {{code: number, lines: string[], findings: Array}}
 */
export function report(projectRoot = process.cwd()) {
    const root = resolve(projectRoot);
    const findings = scan(root);
    const lines = [];

    if (!findings.length) {
        lines.push(
            '✓ No PrimeNG usage found — nothing to migrate.',
            '  Checked package.json, templates (.html and inline), and import specifiers.'
        );
        return { code: EXIT_OK, lines, findings };
    }

    lines.push(`angulux-migrate — ${findings.length} change(s) would be made in ${root}`, '');

    for (const [key, label] of CATEGORIES) {
        const group = findings.filter((f) => f.category === key);
        if (!group.length) continue;
        lines.push(`  ${label} — ${group.length}`);
        for (const f of group) {
            lines.push(`    ${f.file}:${f.line}  ${f.from} → ${f.to}`);
        }
        lines.push('');
    }

    lines.push(
        'Nothing was written. This run only reported what it found.',
        'Your .p-* CSS class names are NOT part of this list and are never changed —',
        'angulux keeps them so your theming and custom styles keep working.',
        'Your TypeScript symbols do not change either: Button, ButtonModule and the rest',
        'keep their names, so only import paths and template selectors move.'
    );

    return { code: EXIT_OK, lines, findings };
}
