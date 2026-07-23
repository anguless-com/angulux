import { resolve } from 'node:path';
import { scan } from './scan.mjs';
import { checkWritable, apply } from './apply.mjs';

export { scan } from './scan.mjs';
export { checkWritable, apply, rewriteText, rewriteManifest } from './apply.mjs';
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
export function report(projectRoot = process.cwd(), { write = false } = {}) {
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

    const kept = [
        'Your .p-* CSS class names are NOT part of this list and are never changed —',
        'angulux keeps them so your theming and custom styles keep working.',
        'Your TypeScript symbols do not change either: Button, ButtonModule and the rest',
        'keep their names, so only import paths and template selectors move.'
    ];

    if (!write) {
        lines.push('Nothing was written. This run only reported what it found.', ...kept, '', 'Re-run with --write to apply it.');
        return { code: EXIT_OK, lines, findings };
    }

    const gate = checkWritable(root);
    if (!gate.ok) {
        lines.push(`✗ REFUSING TO WRITE — ${gate.reason}`, '', 'Nothing was written.');
        return { code: EXIT_REFUSED, lines, findings };
    }

    const { filesChanged, edits } = apply(root, findings);
    lines.push(`✓ Applied ${edits} edit(s) across ${filesChanged} file(s).`, ...kept, '', 'Revert it all with: git checkout -- .');
    return { code: EXIT_OK, lines, findings };
}
