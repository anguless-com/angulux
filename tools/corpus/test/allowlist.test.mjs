import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isAllowed, readAllowed } from '../generate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const at = (p) => resolve(repoRoot, p);

/**
 * This file is the constitution's P1 boundary expressed as tests.
 *
 * P1 forbids taking code from PrimeTek past the MIT line, and the sharper hazard for a
 * DOCUMENTATION corpus is that primeng.dev's prose was never MIT at any version — the MIT
 * release covered the source, never the website. "We did not copy any of it" is a promise
 * that holds until someone is in a hurry, so the boundary is a code path instead: the
 * generator cannot read outside the allowlist, and it has no way to reach the network.
 */

test('the allowlist admits exactly the two roots the corpus is built from', () => {
    assert.equal(isAllowed(at('packages/angulux/src/button/button.ts')), true);
    assert.equal(isAllowed(at('tools/scope/closure.json')), true);
});

test('ref/ is outside the boundary — it is the upstream checkout', () => {
    // ref/primeng and ref/primeuix are the MIT-era upstream sources kept as provenance
    // evidence. They are readable on disk and are exactly what a hurried generator would
    // reach for to fill a missing description.
    assert.equal(isAllowed(at('ref/primeng/packages/primeng/src/button/button.ts')), false);
    assert.equal(isAllowed(at('ref/primeuix/anything.ts')), false);
});

test('everything else outside the two roots is refused', () => {
    for (const path of [
        'node_modules/primeng/button/index.mjs',
        'docs/specs/ai-integration-llms-mcp-plugin.md',
        '.agl/STATE.md',
        'README.md',
        '../somewhere-else/file.ts'
    ]) {
        assert.equal(isAllowed(at(path)), false, `${path} should be outside the allowlist`);
    }
});

test('a refused read throws, and says which rule it is enforcing', () => {
    assert.throws(() => readAllowed(at('ref/primeng/whatever.ts')), (error) => {
        assert.match(error.message, /outside the allowlist/);
        assert.match(error.message, /P1/, 'the error must name the rule, so the next reader knows why');
        return true;
    });
});

test('a permitted read still works', () => {
    assert.match(readAllowed(at('tools/scope/closure.json')), /"closure"/);
});

test('the generator has no way to reach the network or shell out', () => {
    // "Performs no network access" is only a claim unless something checks it. These two
    // files are the whole generation path; if a future edit adds a fetch or a subprocess,
    // this fails and the reviewer gets to ask why a documentation generator needs one.
    for (const file of ['generate.mjs', 'extract.mjs']) {
        const source = readFileSync(resolve(here, '..', file), 'utf8');

        assert.doesNotMatch(source, /\bfetch\s*\(/, `${file} calls fetch`);
        assert.doesNotMatch(source, /node:https?/, `${file} imports an http client`);
        assert.doesNotMatch(source, /node:child_process/, `${file} spawns a subprocess`);
        assert.doesNotMatch(source, /node:net/, `${file} opens a socket`);
    }
});
