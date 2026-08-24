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
    const deprecated = corpus.modules[0].declarations
        .flatMap((d) => d.inputs)
        .filter((i) => i.deprecated !== null);
    assert.ok(deprecated.length > 0, 'fixture must cover the deprecated case');
    for (const input of deprecated) assert.equal(typeof input.deprecated, 'string');
});

test('a slot that lost its name is rejected — the name is the only part a caller writes', () => {
    const corpus = fixture();
    delete corpus.modules[0].declarations[0].slots[0].name;
    assert.match(validateCorpus(corpus).join('\n'), /slots\[0\].*name must be a string/s);
});

test('a slot keeps BOTH names, because one cannot be derived from the other', () => {
    // `loadingIconTemplate` fills `<ng-template #loadingicon>` — all lowercase. Anyone deriving
    // the slot from the field would write `#loadingIcon`, which is not a name Angular matches:
    // the template silently never binds, and nothing anywhere throws. This is exactly the
    // failure the corpus records both names to prevent, so the fixture pins a slot where the
    // two genuinely differ rather than one where the derivation would have worked by luck.
    const slot = fixture()
        .modules[0].declarations.flatMap((d) => d.slots)
        .find((s) => s.name === 'loadingicon');
    assert.ok(slot, 'fixture must cover a slot whose name differs from its field');
    assert.notEqual(slot.name, slot.field.replace(/Template$/, ''));
});

test('ANCHOR: every fact in the fixture is really in button.ts, in the RIGHT class', () => {
    // This test previously only asked "does this string appear somewhere in the file?", and
    // that weakness let a real error through: the fixture credited `Button` with a
    // @deprecated label. The deprecation is on ButtonDirective.label; Button.label is not
    // deprecated at all. Both strings existed in the file, so the weak check passed.
    //
    // Membership is the whole question for a per-class corpus, so the source is now sliced
    // per class and each fact must live inside its own class's region. Deliberately NOT
    // implemented with extract.mjs — a fixture verified by the extractor it exists to pin
    // would prove only that the two agree.
    const source = readFileSync(resolve(repoRoot, 'packages/angulux/src/button/button.ts'), 'utf8');
    const classStarts = [...source.matchAll(/export class (\w+)/g)];

    const regionOf = (name) => {
        const index = classStarts.findIndex((m) => m[1] === name);
        assert.notEqual(index, -1, `class ${name} is not declared in button.ts`);
        const start = classStarts[index].index;
        const end = index + 1 < classStarts.length ? classStarts[index + 1].index : source.length;
        return { body: source.slice(start, end), above: source.slice(0, start) };
    };

    // The import line is the most trusted thing on a module page, so the name in it is the
    // last thing that may be taken on trust. `@NgModule` above the class, not merely the
    // class: a plain exported class of the same name would satisfy a looser check and would
    // not be importable as a module.
    for (const ngModule of fixture().modules[0].ngModules) {
        assert.match(
            source,
            new RegExp(`@NgModule\\(\\{[\\s\\S]*?\\}\\)\\s*export class ${ngModule}\\b`),
            `${ngModule} is not an @NgModule in the source`
        );
    }

    for (const declaration of fixture().modules[0].declarations) {
        const { body, above } = regionOf(declaration.name);

        // The selector sits in the decorator ABOVE the class, so check the nearest one.
        const selectors = [...above.matchAll(/selector:\s*'([^']+)'/g)];
        assert.equal(
            selectors.at(-1)?.[1],
            declaration.selector,
            `${declaration.name}'s nearest preceding selector is not ${declaration.selector}`
        );

        // The base class, read from the `extends` clause rather than trusted. Without this the
        // fixture could name any parent and the validator would be satisfied — and `extends`
        // is the field a renderer follows to find the ten inputs `BaseInput` publishes, so a
        // wrong one sends a reader to the wrong page rather than to none.
        assert.match(
            source,
            new RegExp(`export class ${declaration.name}(?:<[^>]*>)?\\s+extends\\s+${declaration.extends}\\b`),
            `${declaration.name} does not extend ${declaration.extends} in the source`
        );

        for (const input of declaration.inputs) {
            // `field` is the property the class declares; `name` is what a caller writes.
            // Checking `field` is what keeps the pair honest — with only `name` checked, an
            // alias could credit any property with it, and a template binding to the wrong
            // one fails silently, which is the whole defect the pair was added for.
            assert.ok(
                body.includes(`${input.field}:`) || body.includes(`get ${input.field}(`),
                `${declaration.name}.${input.field} is not declared inside ${declaration.name}`
            );
            assert.ok(
                body.includes(input.description.split('\n')[0]),
                `${declaration.name}.${input.name}'s description is not inside ${declaration.name}`
            );
            if (input.deprecated !== null) {
                assert.ok(
                    body.includes(`@deprecated ${input.deprecated}`),
                    `${declaration.name}.${input.name} is not actually deprecated in ${declaration.name}`
                );
            }
        }

        for (const output of declaration.outputs) {
            assert.ok(
                body.includes(`@Output() ${output.field}`),
                `${declaration.name}.${output.name} is not declared inside ${declaration.name}`
            );
        }

        for (const slot of declaration.slots) {
            // Field AND literal name in one assertion, because the pair is the fact. Checking
            // them separately would pass on a fixture that credited `iconTemplate` with the
            // `loadingicon` slot — both halves present in the file, the pairing invented.
            assert.match(
                body,
                new RegExp(`${slot.field}\\s*=\\s*contentChild[^(\\n]*\\(\\s*'${slot.name}'`),
                `${declaration.name} does not declare \`${slot.field} = contentChild('${slot.name}')\``
            );
            assert.ok(
                body.includes(slot.description.split('\n')[0]),
                `${declaration.name}.${slot.field}'s description is not inside ${declaration.name}`
            );
        }
    }
});
