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

test('every named slot the text contains, the AST also found', () => {
    const text = source();
    const all = declarations();

    // Same two-measurement rule as the decorators above. The regex is the one
    // `check-facet-single-route.mjs` has been running against the whole library since BL-35,
    // so agreement here is agreement with the gate that counts 191 of these.
    const byRegex = (text.match(/\w+\s*=\s*contentChild(?:\.required)?[^(\n]*\(\s*'[a-zA-Z]+'/g) || []).length;
    assert.equal(all.flatMap((d) => d.slots).length, byRegex, 'contentChild slot count disagrees with the AST');
});

test('a contentChild that queries a directive is NOT a slot', () => {
    // `contentChild(ButtonIcon)` and `contentChild(ButtonLabel)` are directive queries: nothing
    // a caller fills with `<ng-template #…>`. Recording them would put two slot names into the
    // corpus that cannot be written in markup — the kind of confident fiction this whole corpus
    // exists to keep out. They are why the extractor requires a string literal.
    // On ButtonDirective, which is where those two queries actually live — Button's three
    // contentChild calls all name templates, so asserting there would prove nothing.
    //
    // Counted, not filtered. Asking "did a slot come back NAMED ButtonIcon" passes with the
    // string-literal check removed too: an identifier has no `.text`, so the bad record
    // arrives as `name: undefined` and matches no filter. Zero is the fact that separates them.
    assert.match(source(), /contentChild\(ButtonIcon\)/, 'button.ts must still contain a directive query');
    assert.equal(find('ButtonDirective').slots.length, 0, 'a directive query was recorded as a fillable slot');

    const slots = find('Button').slots;
    assert.equal(slots.length, 3);
    assert.ok(
        slots.every((slot) => typeof slot.name === 'string' && slot.name.length > 0),
        'every slot must carry the name a caller writes'
    );
});

test('a slot carries the name a caller writes, which is not the field name', () => {
    const slot = find('Button').slots.find((s) => s.field === 'loadingIconTemplate');

    // `#loadingicon`, not `#loadingIcon`. Angular matches template reference names exactly and
    // says nothing when one does not match, so the wrong casing here is an invisible failure.
    assert.equal(slot.name, 'loadingicon');
    assert.equal(slot.description, 'Custom loading icon template.');
    assert.equal(slot.deprecated, null);
});

/**
 * Added with corpus format 3. Both facts below were absent, and both made the published API
 * reference describe something a template cannot do — silently, because binding to a name
 * Angular does not know is not an error.
 */

const AUTOFOCUS = resolve(repoRoot, 'packages/angulux/src/autofocus/autofocus.ts');
const PASSWORD = resolve(repoRoot, 'packages/angulux/src/password/password.ts');

test('an input published under an alias reports the name a caller writes', () => {
    // `@Input('aglAutoFocus') autofocus` — the decorator-string form, 34 of them in src.
    // A reader told to write `autofocus` binds nothing and gets no error to explain it.
    const [directive] = extractFile(AUTOFOCUS);
    const [input] = directive.inputs;

    assert.equal(input.name, 'aglAutoFocus', 'name is what goes in the template');
    assert.equal(input.field, 'autofocus', 'field is what the class calls it');
});

test('the alias is found in the options object too, not only the decorator', () => {
    // `size = input(undefined, { alias: 'aglSize' })` — the signal form, 26 of them in src.
    // Same defect, different syntax; a matcher that knew only one form would have left half
    // the aliases wrong while looking like it worked.
    const directive = extractFile(PASSWORD).find((d) => d.name === 'PasswordDirective');
    const size = directive.inputs.find((i) => i.field === 'size');

    assert.equal(size.name, 'aglSize');
});

test('a member with no alias has field equal to name, never a missing key', () => {
    // The contract requires both on every member. An absent `field` would be a second way to
    // say "no alias", and the renderers would each have to guess which one they were reading.
    for (const declaration of extractFile(BUTTON)) {
        for (const member of [...declaration.inputs, ...declaration.outputs]) {
            assert.equal(typeof member.field, 'string', `${declaration.name}.${member.name} has no field`);
        }
    }

    const label = find('Button').inputs.find((i) => i.name === 'label');

    assert.equal(label.field, 'label');
});

test('the base class is recorded without its type arguments', () => {
    // `class Button extends BaseComponent<ButtonPassThrough>` resolves to `BaseComponent`,
    // because that is the name the corpus indexes declarations under. Keeping the generic
    // would make the lookup miss and the page silently drop ten inherited inputs.
    assert.equal(find('Button').extends, 'BaseComponent');
    assert.equal(extractFile(AUTOFOCUS)[0].extends, 'BaseComponent');
});
