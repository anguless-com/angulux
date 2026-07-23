import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** The file a consumer authors in their own project root. */
export const CONFIG_FILENAME = '.angulux-license-guard.json';

const ALLOWED_TOP_LEVEL = new Set(['acknowledged']);
const ALLOWED_ENTRY_FIELDS = new Set(['name', 'version', 'reason']);

/**
 * Read the acknowledgement config.
 *
 * Everything here is rejected loudly rather than repaired quietly. This file is a legal
 * opt-out: an author who mistypes `verison` must be told, not silently left believing they
 * acknowledged something. Unknown keys are errors for the same reason a global "disabled"
 * switch does not exist — the shape of the file is part of the guarantee.
 *
 * @returns {{entries: Array<{name: string, version: string, reason?: string}>, errors: string[]}}
 */
export function loadAcknowledgements(projectRoot) {
    const path = join(projectRoot, CONFIG_FILENAME);
    if (!existsSync(path)) return { entries: [], errors: [] };

    let parsed;
    try {
        parsed = JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
        return { entries: [], errors: [`${CONFIG_FILENAME} is not valid JSON: ${e.message}`] };
    }

    const errors = [];
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { entries: [], errors: [`${CONFIG_FILENAME} must contain a JSON object`] };
    }

    for (const key of Object.keys(parsed)) {
        if (!ALLOWED_TOP_LEVEL.has(key)) {
            errors.push(`${CONFIG_FILENAME}: unknown field "${key}" — there is no global off switch`);
        }
    }

    const raw = parsed.acknowledged ?? [];
    if (!Array.isArray(raw)) {
        errors.push(`${CONFIG_FILENAME}: "acknowledged" must be an array`);
        return { entries: [], errors };
    }

    const entries = [];
    raw.forEach((entry, i) => {
        const at = `${CONFIG_FILENAME}: acknowledged[${i}]`;
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
            errors.push(`${at} must be an object`);
            return;
        }
        for (const key of Object.keys(entry)) {
            if (!ALLOWED_ENTRY_FIELDS.has(key)) {
                errors.push(`${at}: unknown field "${key}"`);
            }
        }
        if (typeof entry.name !== 'string' || !entry.name) {
            errors.push(`${at} is missing "name"`);
            return;
        }
        if (typeof entry.version !== 'string' || !entry.version) {
            errors.push(`${at} ("${entry.name}") is missing "version" — an acknowledgement must name an exact version`);
            return;
        }
        if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(entry.version)) {
            errors.push(
                `${at} ("${entry.name}") has version "${entry.version}" — must be an exact version, not a range or wildcard`
            );
            return;
        }
        entries.push({ name: entry.name, version: entry.version, reason: entry.reason });
    });

    return { entries, errors };
}

/**
 * Drop the violations a human has explicitly signed off, matching on name AND exact version.
 *
 * The version match is the mechanism, not a formality: when a dependency moves, the artifact
 * nobody has inspected is a new one, and the build goes red again on purpose.
 */
export function applyAcknowledgements(violations, entries) {
    if (!entries?.length) return violations;
    return violations.filter(
        (v) => !entries.some((e) => e.name === v.name && e.version === String(v.version))
    );
}
