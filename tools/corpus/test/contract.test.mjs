import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCorpus } from '../contract.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const fixturePath = resolve(here, '../fixtures/button.expected.json');
const fixture = () => JSON.parse(readFileSync(fixturePath, 'utf8'));

/**
 * WHY THIS FILE EXISTS.
 *
 * The corpus is a FILE FORMAT — a wire boundary. Type checkers cannot see across it, and it
 * is the thing an MCP server and a docs site will both read later, so its shape has to be
 * pinned before a generator exists to shape it accidentally.
 *
 * The fixture is deliberately a REAL record read out of `packages/angulux/src/button/`, not
 * an invented one. A fixture someone made up only proves the validator matches what they
 * fed it — the exact circular-test trap recorded in the brain, where a regex was tested
 * against a package name that did not exist while a real one went unmatched. The last test
 * here anchors the fixture to the source file so it cannot quietly become fiction.
 */

test('the real button fixture satisfies the contract', () => {
    assert.deepEqual(validateCorpus(fixture()), []);
});

test('a missing default is null AND flagged, never silently omitted', () => {
    // The honesty invariant. Only 136 of 1038 inputs declare @defaultValue, so "we do not
    // know the default" is the common case and has to stay VISIBLE to a reading model.
    // Claiming a default while saying none was declared is a contradiction, not a nicety.
    const corpus = fixture();
    corpus.modules[0].declarations[0].inputs[0].default = 'large';
    const problems = validateCorpus(corpus);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /defaultDeclared is false but default is not null/);
});

test('an input that lost its type is rejected', () => {
    const corpus = fixture();
    delete corpus.modules[0].declarations[0].inputs[0].type;
    assert.match(validateCorpus(corpus).join('\n'), /type/);
});

test('a module without a name is rejected', () => {
    const corpus = fixture();
    delete corpus.modules[0].name;
    assert.match(validateCorpus(corpus).join('\n'), /name/);
});

test('an unknown declaration kind is rejected', () => {
    const corpus = fixture();
    corpus.modules[0].declarations[0].kind = 'widget';
    assert.match(validateCorpus(corpus).join('\n'), /kind/);
});

test('a deprecated input keeps its reason, because a model must not recommend it', () => {
    const corpus = fixture();
    const deprecated = corpus.modules[0].declarations[0].inputs.filter((i) => i.deprecated !== null);
    assert.ok(deprecated.length > 0, 'fixture must cover the deprecated case');
    for (const input of deprecated) assert.equal(typeof input.deprecated, 'string');
});

test('ANCHOR: every fact in the fixture is really in button.ts', () => {
    // Guards against the fixture drifting into fiction. If someone edits the fixture to make
    // a test pass, this fails unless they also changed the library — which is the point.
    const source = readFileSync(resolve(repoRoot, 'packages/angulux/src/button/button.ts'), 'utf8');
    const declaration = fixture().modules[0].declarations[0];

    assert.ok(source.includes(`selector: '${declaration.selector}'`), `selector ${declaration.selector} not in button.ts`);
    assert.ok(source.includes(`export class ${declaration.name} `), `class ${declaration.name} not in button.ts`);

    for (const input of declaration.inputs) {
        assert.ok(
            source.includes(`@Input() ${input.name}`) || source.includes(`@Input() get ${input.name}(`),
            `input ${input.name} is not declared in button.ts`
        );
        assert.ok(source.includes(input.description.split('\n')[0]), `description of ${input.name} is not in button.ts`);
    }

    for (const output of declaration.outputs) {
        assert.ok(source.includes(`@Output() ${output.name}`), `output ${output.name} is not declared in button.ts`);
    }
});
