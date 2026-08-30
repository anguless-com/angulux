import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractModule, sourceFilesOf } from '../extract.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const SRC = resolve(repoRoot, 'packages/angulux/src');
const closure = JSON.parse(readFileSync(resolve(repoRoot, 'tools/scope/closure.json'), 'utf8')).closure;

/**
 * These run over the WHOLE warranted surface, not a sample. The corpus's core claim is that
 * it describes all 65 modules, so a test that checked three of them would be measuring the
 * wrong thing — the interesting failures are in the modules nobody thought about.
 */

test('every warranted module extracts without throwing', () => {
    const failures = [];
    for (const name of closure) {
        try {
            extractModule(resolve(SRC, name));
        } catch (error) {
            failures.push(`${name}: ${error.message}`);
        }
    }
    assert.deepEqual(failures, []);
    assert.equal(closure.length, 65, 'closure size changed — the corpus subject set moved');
});

test('the AST finds every @Component/@Directive the text declares, across all 65', () => {
    // Independent measure again: a regex over the raw files versus the syntax walk. This is
    // what would catch declarations hiding in a subdirectory the walker never visits.
    let astTotal = 0;
    let textTotal = 0;

    for (const name of closure) {
        const dir = resolve(SRC, name);
        astTotal += extractModule(dir).length;
        for (const file of sourceFilesOf(dir)) {
            const text = readFileSync(file, 'utf8');
            textTotal += (text.match(/^@(Component|Directive)\(/gm) || []).length;
        }
    }

    assert.ok(astTotal > 0, 'no declarations found at all — the walker is looking in the wrong place');
    assert.equal(astTotal, textTotal, 'AST and text disagree on how many declarations exist');
});

test('spec files are never a source of documentation', () => {
    // 48 in-scope spec files declare throwaway host components. Documenting them would put
    // fictional selectors into the corpus and, from there, into an assistant's answer.
    for (const name of closure) {
        for (const file of sourceFilesOf(resolve(SRC, name))) {
            assert.doesNotMatch(file, /\.spec\.ts$/, `${file} is a spec file`);
        }
    }
});

test('a module with no declarations yields an empty list, not an error', () => {
    // Absence is data. `api` is types and tokens with nothing to render, and the corpus has
    // to be able to say "this module declares nothing" rather than omit it.
    const empty = closure.filter((name) => extractModule(resolve(SRC, name)).length === 0);
    assert.ok(empty.length > 0, 'expected at least one declaration-free module in the closure');
    assert.deepEqual(extractModule(resolve(SRC, empty[0])), []);
});

test('button still resolves to its four declarations through the module entry point', () => {
    const names = extractModule(resolve(SRC, 'button')).map((d) => d.name);
    assert.deepEqual(names.sort(), ['Button', 'ButtonDirective', 'ButtonIcon', 'ButtonLabel']);
});
