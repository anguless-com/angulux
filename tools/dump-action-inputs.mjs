#!/usr/bin/env node
/**
 * dump-action-inputs — regenerate .github/action-inputs.json from the real action.yml files.
 *
 * This is a MAINTAINER tool, not a gate. It reaches the network (via `gh`) and is run by
 * hand when an action version changes — Dependabot bumps one, `check:action-inputs` goes red
 * because the pinned version no longer matches the snapshot, and this refreshes it. The gate
 * itself stays offline and dependency-free.
 *
 *   node tools/dump-action-inputs.mjs           # print the regenerated snapshot
 *   node tools/dump-action-inputs.mjs --write    # write it to .github/action-inputs.json
 *
 * It discovers the actions to record by scanning the workflows, so a newly added action is
 * picked up automatically.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = resolve(repoRoot, '.github/action-inputs.json');

const workflows = execFileSync('git', ['ls-files', '.github/workflows'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.ya?ml$/.test(f));

// Every `uses: owner/repo(/subpath)@ref` across the workflows.
const specs = new Set();
for (const wf of workflows) {
    const text = readFileSync(resolve(repoRoot, wf), 'utf8');
    for (const m of text.matchAll(/^\s*-?\s*uses:\s*['"]?([^\s'"@]+@[^\s'"]+)['"]?/gm)) {
        specs.add(m[1]);
    }
}

function fetchActionYml(spec) {
    const [name, ref] = spec.split('@');
    const parts = name.split('/');
    const repo = parts.slice(0, 2).join('/');
    const sub = parts.slice(2).join('/');
    const base = sub ? `${sub}/` : '';
    for (const fn of ['action.yml', 'action.yaml']) {
        try {
            const b64 = execFileSync('gh', ['api', `repos/${repo}/contents/${base}${fn}?ref=${ref}`, '--jq', '.content'], {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore']
            });
            return Buffer.from(b64, 'base64').toString('utf8');
        } catch {
            /* try next filename */
        }
    }
    return null;
}

function inputNames(yml) {
    const m = yml.match(/^inputs:\s*\n([\s\S]*?)(?=^\S|$(?![\s\S]))/m);
    if (!m) return [];
    return [...new Set([...m[1].matchAll(/^ {2}([A-Za-z0-9_-]+):/gm)].map((x) => x[1]))].sort();
}

const actions = {};
const failed = [];
for (const spec of [...specs].sort()) {
    const yml = fetchActionYml(spec);
    if (!yml) {
        console.error(`  !! could not fetch ${spec}`);
        failed.push(spec);
        continue;
    }
    actions[spec] = inputNames(yml);
    console.error(`  ${spec}: ${actions[spec].length} inputs`);
}

const existing = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const out = { _comment: existing._comment, _regenerate: existing._regenerate, actions };
const json = JSON.stringify(out, null, 2) + '\n';

// A PARTIAL SNAPSHOT IS WORSE THAN NO SNAPSHOT, so this refuses to write one.
//
// Found the hard way on 2026-08-29, pinning every action to a SHA: fourteen fetches in a
// burst tripped a secondary rate limit, six came back empty, and this wrote the snapshot
// anyway and exited 0. check:action-inputs then failed with "has no recorded schema",
// which reads like the workflow is wrong rather than like the regeneration was truncated.
//
// The silent half is worse than the noisy one. An action that passes no `with:` block is
// skipped by the gate entirely, so dropping ITS entry costs coverage with nothing going
// red — the snapshot would simply describe less than it used to, and the next renamed
// input on that action would land unguarded. Waiting a minute and re-running is cheap;
// finding that out later is not.
if (failed.length) {
    console.error(`\n!! ${failed.length} of ${specs.size} action(s) could not be fetched:`);
    for (const spec of failed) console.error(`     ${spec}`);
    console.error('\n   Refusing to write a partial snapshot. A burst of fetches can trip a');
    console.error('   secondary rate limit — check `gh api rate_limit`, wait, and re-run.\n');
    process.exit(1);
}

if (process.argv.includes('--write')) {
    writeFileSync(SNAPSHOT, json);
    console.error(`\nwrote ${SNAPSHOT}`);
} else {
    process.stdout.write(json);
}
