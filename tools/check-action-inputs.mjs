#!/usr/bin/env node
/**
 * check-action-inputs — the guard for the class of bug BL-26 was.
 *
 * WHY THIS EXISTS: `actions/first-interaction@v3` renamed its inputs to snake_case. GitHub
 * Actions SILENTLY IGNORES unknown `with:` keys — so the greet job kept passing while doing
 * nothing, and no error was raised anywhere. A misspelled or renamed input is invisible.
 *
 * So every `with:` key we pass is checked against the action's REAL input list, recorded in
 * `.github/action-inputs.json` from each action's `action.yml` at its pinned ref. Two things
 * fail the gate:
 *   1. a `with:` key that is not a real input of that action (the silent-ignore bug), and
 *   2. a `uses:` that passes `with:` but has no recorded schema — Dependabot bumped it and
 *      nobody refetched the new action.yml. The gate forces that human check.
 *
 * The snapshot is authored with the network (fetch each action.yml); the gate runs offline
 * against the committed file, so `npm run check` stays dependency-free and ~instant.
 *
 * Parsing note: workflows use block scalars (`issue_message: |`) whose multi-line content
 * contains markdown that looks like YAML keys. A naive regex mistakes that content for
 * `with:` keys. This parser tracks indentation and skips block-scalar bodies, so only real
 * keys are checked.
 *
 * Usage: node tools/check-action-inputs.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(readFileSync(resolve(repoRoot, '.github/action-inputs.json'), 'utf8')).actions;

const workflows = execFileSync('git', ['ls-files', '.github/workflows'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.ya?ml$/.test(f));

const indentOf = (line) => line.length - line.replace(/^ */, '').length;

/**
 * Extract every step's `uses:` and the direct child keys of its `with:` block.
 * Block scalars (`key: |` / `key: >` with optional chomping) are skipped: everything more
 * indented than such a key is literal content, not keys.
 *
 * @returns {Array<{action: string, withKeys: string[], line: number}>}
 */
function parseSteps(text) {
    const lines = text.split('\n');
    const steps = [];

    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^(\s*)-?\s*uses:\s*['"]?([^\s'"]+)['"]?/);
        if (!m) continue;
        // The COLUMN of the `uses:` key, not the dash. For `  - uses:` the sibling `with:`
        // aligns with `uses`, two columns right of the dash — indentOf would give the dash.
        const keyCol = lines[i].indexOf('uses:');
        const action = m[2];

        // Scan the rest of this step for a sibling `with:` block (same column as uses:).
        const withKeys = [];
        for (let j = i + 1; j < lines.length; j++) {
            const line = lines[j];
            if (line.trim() === '' || /^\s*#/.test(line)) continue;
            const ind = indentOf(line);
            // Left the step: a shallower line (the next `- ` item's dash sits at keyCol-2).
            if (ind < keyCol) break;

            if (ind === keyCol && /^\s*with:\s*$/.test(line)) {
                // Collect direct children of with:.
                let childIndent = null;
                for (let k = j + 1; k < lines.length; k++) {
                    const cl = lines[k];
                    if (cl.trim() === '' || /^\s*#/.test(cl)) continue;
                    const ci = indentOf(cl);
                    if (ci <= keyCol) break; // end of with: block
                    if (childIndent === null) childIndent = ci;
                    if (ci !== childIndent) continue; // deeper => block-scalar body or nested, skip
                    const km = cl.match(/^\s*([A-Za-z0-9_-]+):(.*)$/);
                    if (!km) continue;
                    withKeys.push(km[1]);
                    // If the value is a block scalar, skip its indented body so its markdown
                    // content is never read as keys.
                    if (/^\s*[|>][+-]?\d*\s*$/.test(km[2])) {
                        while (k + 1 < lines.length) {
                            const nl = lines[k + 1];
                            if (nl.trim() !== '' && indentOf(nl) <= childIndent) break;
                            k++;
                        }
                    }
                }
                break;
            }
        }

        steps.push({ action, withKeys, line: i + 1 });
    }
    return steps;
}

const problems = [];
for (const wf of workflows) {
    const text = readFileSync(resolve(repoRoot, wf), 'utf8');
    for (const { action, withKeys, line } of parseSteps(text)) {
        if (!withKeys.length) continue;
        const valid = snapshot[action];
        if (!valid) {
            problems.push([wf, `line ${line}: ${action} passes \`with:\` but has no recorded schema — refetch its action.yml into .github/action-inputs.json`]);
            continue;
        }
        for (const key of withKeys) {
            if (!valid.includes(key)) {
                problems.push([wf, `line ${line}: ${action} has no input "${key}" — GitHub ignores it silently. Valid: ${valid.join(', ')}`]);
            }
        }
    }
}

if (problems.length) {
    console.error('\n✗ a workflow passes a `with:` key that is not a real action input\n');
    let last = null;
    for (const [file, msg] of problems) {
        if (file !== last) {
            console.error(`  ${file}`);
            last = file;
        }
        console.error(`      ${msg}`);
    }
    console.error('\n  GitHub Actions ignores unknown `with:` keys silently, so this fails no job — it just');
    console.error('  stops doing what you meant. Fix the key, or update .github/action-inputs.json.\n');
    process.exit(1);
}

console.log(`✓ check-action-inputs: every \`with:\` key across ${workflows.length} workflows is a real input of its action.`);
