import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractFile } from '../extract.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const BUTTON = resolve(repoRoot, 'packages/angulux/src/button/button.ts');

const source = () => readFileSync(BUTTON, 'utf8');
const declarations = () => extractFile(BUTTON);
const find = (name) => declarations().find((d) => d.name === name);

/**
 * The extractor is checked against the FILE, by two independent methods.
 *
 * The AST walk is one measurement; counting decorator occurrences in the raw text with a
 * regex is a completely different one. Where they agree, the number is evidence. Where the
 * test simply asserted a hardcoded 25, it would only be proving that someone once typed 25
 * — and it would keep passing after the extractor started silently dropping members.
 */

test('every decorated member the text contains, the AST also found', () => {
    const text = source();
    const byRegex = (pattern) => (text.match(pattern) || []).length;

    const all = declarations();
    const astInputs = all.flatMap((d) => d.inputs).filter((i) => !i.signal).length;
    const astOutputs = all.flatMap((d) => d.outputs).filter((o) => !o.signal).length;

    // `@Input(` not `@Input()`: button.ts also uses `@Input({ transform: booleanAttribute })`
    // 15 times. Counting only the bare form measured 25 against a true 40 and would have
    // reported the extractor broken while it was right.
    assert.equal(astInputs, byRegex(/@Input\(/g), 'decorator @Input count disagrees with the AST');
    assert.equal(astOutputs, byRegex(/@Output\(/g), 'decorator @Output count disagrees with the AST');
});

test('signal inputs are found too, and marked as signals', () => {
    // Angular has two input styles and button.ts uses BOTH. An extractor that knew only
    // about @Input() would silently document a fraction of the API.
    const text = source();
    // `[<(]` because both `input<T>()` and the untyped `input(...)` appear in this file.
    const expected = (text.match(/=\s*input(\.required)?[<(]/g) || []).length;
    const signals = declarations().flatMap((d) => d.inputs).filter((i) => i.signal);

    assert.equal(signals.length, expected);
    assert.ok(expected > 0, 'button.ts is expected to contain signal inputs');
});

test('all four declarations in button.ts are found, with their real selectors', () => {
    const found = Object.fromEntries(declarations().map((d) => [d.name, d]));

    assert.equal(found.Button?.kind, 'component');
    assert.equal(found.Button?.selector, 'agl-button');
    assert.equal(found.ButtonDirective?.kind, 'directive');
    assert.equal(found.ButtonDirective?.selector, '[aglButton]');
    assert.equal(found.ButtonLabel?.selector, '[aglButtonLabel]');
    assert.equal(found.ButtonIcon?.selector, '[aglButtonIcon]');
});

test('an NgModule is not a documentable declaration', () => {
    assert.equal(find('ButtonModule'), undefined);
});

test('JSDoc description, @group and type text survive extraction', () => {
    const size = find('Button').inputs.find((i) => i.name === 'size');

    assert.equal(size.description, 'Defines the size of the button.');
    assert.equal(size.group, 'Props');
    assert.equal(size.type, "'small' | 'large' | undefined");
});

test('a getter-based input keeps its return type, not its setter type', () => {
    const label = find('Button').inputs.find((i) => i.name === 'label');
    assert.equal(label.type, 'string | undefined');
});

test('@deprecated is captured with its reason, on the class that actually declares it', () => {
    // ButtonDirective.label is deprecated; Button.label is NOT. Two same-named inputs on two
    // different declarations, one deprecated and one not — which is exactly why the corpus is
    // keyed by declaration rather than by module, and why an assistant reading it can tell a
    // caller which `label` they are actually using.
    assert.equal(
        find('ButtonDirective').inputs.find((i) => i.name === 'label').deprecated,
        'use aglButtonLabel directive instead.'
    );
    assert.equal(find('Button').inputs.find((i) => i.name === 'label').deprecated, null);
});

test('an undeclared default stays null and flagged, never guessed from the initializer', () => {
    // iconPos is initialised to 'left' in code but declares no @defaultValue. Reporting
    // 'left' would be inventing documentation the source never made; the honest answer is
    // "not declared", which is what a reading model needs to see.
    const iconPos = find('Button').inputs.find((i) => i.name === 'iconPos');

    assert.equal(iconPos.defaultDeclared, false);
    assert.equal(iconPos.default, null);
});

test('outputs come through with type and group', () => {
    const onClick = find('Button').outputs.find((o) => o.name === 'onClick');

    assert.equal(onClick.type, 'EventEmitter<MouseEvent>');
    assert.equal(onClick.group, 'Emits');
    assert.match(onClick.description, /^Callback to execute when button is clicked\./);
});
