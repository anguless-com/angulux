import { resolve } from 'node:path';
import { TABLE_VERIFIED } from './boundary.mjs';
import { readLock, NoLockfileError } from './lockfile.mjs';
import { detect } from './detect.mjs';
import { loadAcknowledgements, applyAcknowledgements, CONFIG_FILENAME } from './acknowledge.mjs';

export { FIRST_COMMERCIAL, ALWAYS_COMMERCIAL, TABLE_VERIFIED, isPrimeTekPackage } from './boundary.mjs';
export { detect } from './detect.mjs';
export { readLock, NoLockfileError } from './lockfile.mjs';
export { loadAcknowledgements, applyAcknowledgements, CONFIG_FILENAME } from './acknowledge.mjs';

/** Exit codes. These are a contract: other people's CI branches on them. */
export const EXIT_CLEAN = 0;
export const EXIT_VIOLATION = 1;

/**
 * Run the guard against a project directory.
 *
 * Returns the outcome instead of exiting, so the whole decision path is testable without a
 * process boundary. `bin/` is the only place that touches process.exit.
 *
 * @returns {{code: number, lines: string[]}}
 */
export function run(projectRoot = process.cwd()) {
    const root = resolve(projectRoot);
    const lines = [];
    const footer = `  boundary table verified ${TABLE_VERIFIED} · no release cadence is promised — see primeui.dev/nextchapter`;

    let packages;
    try {
        packages = readLock(root);
    } catch (e) {
        if (e instanceof NoLockfileError) {
            lines.push('✗ NO LOCKFILE', `  ${e.message}`, footer);
            return { code: EXIT_VIOLATION, lines };
        }
        throw e;
    }

    const { entries, errors } = loadAcknowledgements(root);
    if (errors.length) {
        // A malformed legal opt-out is itself a failure. Proceeding with the entries we could
        // parse would apply an acknowledgement the author did not successfully write.
        lines.push(`✗ ${CONFIG_FILENAME} IS NOT VALID`, ...errors.map((e) => `  ${e}`), footer);
        return { code: EXIT_VIOLATION, lines };
    }

    const { violations, seen } = detect(packages);
    const remaining = applyAcknowledgements(violations, entries);

    if (remaining.length) {
        lines.push('✗ COMMERCIALLY LICENSED PRIMETEK PACKAGE DETECTED', '');
        for (const v of remaining) {
            lines.push(`   ${v.name}@${v.version}`, `      → ${v.reason}`);
        }
        lines.push(
            '',
            '  These versions are NOT MIT. Using them requires a PrimeUI licence.',
            '  Fix: downgrade to the last MIT release and pin it exactly (drop the ^).',
            footer
        );
        return { code: EXIT_VIOLATION, lines };
    }

    const acked = violations.length - remaining.length;
    if (!seen.length) {
        lines.push('✓ prime-license: no PrimeTek dependency in the tree.');
    } else {
        lines.push(`✓ prime-license: ${seen.length} PrimeTek package(s), all on MIT releases.`);
        for (const s of [...seen].sort((a, b) => a.name.localeCompare(b.name))) {
            lines.push(`    ${s.name}@${s.version}`);
        }
    }
    if (acked) lines.push(`  (${acked} acknowledged by ${CONFIG_FILENAME})`);
    lines.push(footer);
    return { code: EXIT_CLEAN, lines };
}
