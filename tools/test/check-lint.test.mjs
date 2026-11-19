import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const eslint = new ESLint({ cwd: repoRoot });

/**
 * The lint gate fires. Every rule in `eslint.config.mjs` was switched on at zero findings,
 * which is also what a rule that matches nothing looks like. So each one is handed a
 * violation here, as text under a virtual path: nothing is written into the scanned trees.
 */

/** Lint `code` as if it were the file at `path`; return the rule ids reported. */
async function rulesFor(path, code) {
    const [result] = await eslint.lintText(code, { filePath: join(repoRoot, path) });
    const fatal = result.messages.filter((m) => m.fatal);
    assert.deepEqual(fatal, [], `the fixture for ${path} must parse`);
    return result.messages.map((m) => `${m.ruleId}: ${m.message}`);
}

const component = (body, meta = '') => `
import { Component } from '@angular/core';
@Component({ selector: 'x-probe', template: '', ${meta} })
export class Probe { ${body} }
`;

const APP = 'apps/verify/src/probe.ts';

const cases = [
    ['standalone: true', component('', 'standalone: true'), /standalone: true/],
    ['standalone: false', component('', 'standalone: false'), /prefer-standalone/],
    ['explicit OnPush', `import { ChangeDetectionStrategy } from '@angular/core';` + component('', 'changeDetection: ChangeDetectionStrategy.OnPush'), /OnPush is the default/],
    ['signal mutate', `declare const s: { mutate(f: (v: number[]) => void): void };\ns.mutate((v) => v.push(1));`, /no `mutate`/],
    ['any', `export const x: any = 1;`, /no-explicit-any/],
    ['@ts-ignore', `// @ts-ignore\nexport const x: number = 1;`, /ban-ts-comment/],
    ['decorator input', `import { Input } from '@angular/core';` + component('@Input() name = "";'), /prefer-signals/],
    ['decorator query', `import { ViewChild } from '@angular/core';` + component('@ViewChild("a") a: unknown;'), /prefer-signals/],
    ['EventEmitter output', `import { Output, EventEmitter } from '@angular/core';` + component('@Output() done = new EventEmitter<void>();'), /prefer-output-emitter-ref/],
    ['input + output pair instead of model', `import { input, output } from '@angular/core';` + component('value = input(0); valueChange = output<number>();'), /prefer-signal-model/],
    ['constructor injection', `import { ElementRef } from '@angular/core';` + component('constructor(private el: ElementRef) {}'), /prefer-inject/],
    ['@HostBinding', `import { HostBinding } from '@angular/core';` + component('@HostBinding("class.on") on = true;'), /prefer-host-metadata-property/],
    ['@HostListener', `import { HostListener } from '@angular/core';` + component('@HostListener("click") go() {}'), /prefer-host-metadata-property/],
    ['*ngIf in an inline template', component('', '').replace(`template: ''`, `template: '<p *ngIf="on">x</p>'`), /prefer-control-flow/],
    ['ngClass in an inline template', component('', '').replace(`template: ''`, `template: '<p [ngClass]="c">x</p>'`), /prefer-class-binding/],
    ['ngStyle in an inline template', component('', '').replace(`template: ''`, `template: '<p [ngStyle]="s">x</p>'`), /prefer-style-binding/],
    ['fit', `fit('a', () => {});`, /Focused test/],
    ['fdescribe', `fdescribe('a', () => {});`, /Focused test/],
    ['test.only', `test.only('a', () => {});`, /Focused test/],
    ['test.describe.only', `test.describe.only('a', () => {});`, /Focused test/]
];

for (const [name, code, expected] of cases) {
    test(`fires on: ${name}`, async () => {
        const found = await rulesFor(APP, code);
        assert.ok(
            found.some((f) => expected.test(f)),
            `expected ${expected} in:\n${found.join('\n') || '(nothing reported)'}`
        );
    });
}

test('a component written the Angular 22 way is clean', async () => {
    const code = `
import { Component, ElementRef, inject, input, model, output, viewChild } from '@angular/core';
@Component({
    selector: 'x-probe',
    host: { '[class.on]': 'on()', '(click)': 'go()' },
    template: '@if (on()) { <p [class.big]="on()" [style.width.px]="10">x</p> }'
})
export class Probe {
    private readonly el = inject(ElementRef);
    on = input(false);
    value = model(0);
    done = output<void>();
    ref = viewChild<ElementRef>('a');
    go() { this.done.emit(); }
}
`;
    assert.deepEqual(await rulesFor(APP, code), []);
});

test('the same rules reach the showcase and e2e', async () => {
    assert.equal((await rulesFor('apps/showcase/src/probe.ts', `export const x: any = 1;`)).length, 1);
    assert.equal((await rulesFor('e2e/probe.spec.ts', `test.only('a', () => {});`)).length, 1);
});

test('an external template is linted', async () => {
    const found = await rulesFor('apps/verify/src/probe.html', `<p *ngIf="on">x</p>`);
    assert.ok(found.some((f) => /prefer-control-flow/.test(f)), found.join('\n'));
});

test('an eslint-disable comment does not silence a finding', async () => {
    const found = await rulesFor(APP, `// eslint-disable-next-line @typescript-eslint/no-explicit-any\nexport const x: any = 1;`);
    assert.ok(found.some((f) => /no-explicit-any/.test(f)), found.join('\n'));
});

test('a package spec is held to "no focused test" and to nothing else', async () => {
    const spec = 'packages/angulux/src/button/probe.spec.ts';
    assert.equal((await rulesFor(spec, `fit('a', () => {});`)).length, 1);
    // Inherited shape: skips, `any` and decorators are not this gate's business there.
    assert.deepEqual(await rulesFor(spec, `xit('a', () => {});\nexport const x: any = 1;`), []);
});

test('library source is out of scope: no config block applies to it', async () => {
    const config = await eslint.calculateConfigForFile(join(repoRoot, 'packages/angulux/src/button/button.ts'));
    assert.equal(config, undefined);
});
