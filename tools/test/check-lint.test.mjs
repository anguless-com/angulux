import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

import { compare, prune, countFindings, ruleKey } from '../lib/lint-baseline.mjs';

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
    ['signal mutate', `declare const s: { mutate(f: (v: number[]) => void): void };\ns.mutate((v) => v.push(1));`, /Signal mutate/],
    ['any', `export const x: any = 1;`, /no-explicit-any/],
    ['@ts-ignore', `// @ts-ignore\nexport const x: number = 1;`, /ban-ts-comment/],
    ['decorator input', `import { Input } from '@angular/core';` + component('@Input() name = "";'), /prefer-signals/],
    ['decorator query', `import { ViewChild } from '@angular/core';` + component('@ViewChild("a") a: unknown;'), /prefer-signals/],
    ['EventEmitter output', `import { Output, EventEmitter } from '@angular/core';` + component('@Output() done = new EventEmitter<void>();'), /prefer-output-emitter-ref/],
    ['input + output pair instead of model', `import { input, output } from '@angular/core';` + component('value = input(0); valueChange = output<number>();'), /prefer-signal-model/],
    ['constructor injection', `import { ElementRef } from '@angular/core';` + component('constructor(private el: ElementRef) {}'), /prefer-inject/],
    ['CommonModule import', `import { CommonModule } from '@angular/common';` + component('', 'imports: [CommonModule]'), /no-restricted-imports/],
    ['@Injectable root singleton', `import { Injectable } from '@angular/core';\n@Injectable({ providedIn: 'root' })\nexport class Store {}`, /prefer-service-decorator/],
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

test('a single pipe from @angular/common and a @Service singleton are clean', async () => {
    const code = `
import { JsonPipe } from '@angular/common';
import { Component, Injectable, Service } from '@angular/core';
@Service()
export class Store {}
@Injectable()
export class Scoped {}
@Component({ selector: 'x-probe', imports: [JsonPipe], template: '{{ 1 | json }}' })
export class Probe {}
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

const withTemplate = (html) => component('', '').replace(`template: ''`, 'template: `' + html + '`');

const A11Y = [
    ['a click handler on a div', '<div (click)="go()">x</div>', /interactive-supports-focus/],
    ['a click handler with no key handler', '<div (click)="go()">x</div>', /click-events-have-key-events/],
    ['a button without a type', '<button>x</button>', /button-has-type/],
    ['autofocus', '<input type="text" aria-label="n" autofocus />', /no-autofocus/],
    ['an image without alt', '<img src="a.png" />', /alt-text/],
    ['a positive tabindex', '<span tabindex="3">x</span>', /no-positive-tabindex/],
    ['an invalid aria attribute', '<span aria-labeledby="a">x</span>', /valid-aria/],
    ['a role without its required aria', '<span role="checkbox">x</span>', /role-has-required-aria/]
];

for (const [name, html, expected] of A11Y) {
    test(`showcase accessibility fires on: ${name}`, async () => {
        const found = await rulesFor('apps/showcase/src/probe.ts', withTemplate(html));
        assert.ok(
            found.some((f) => expected.test(f)),
            `expected ${expected} in:\n${found.join('\n') || '(nothing reported)'}`
        );
    });
}

test('a backdrop hidden from assistive technology may close on click', async () => {
    assert.deepEqual(await rulesFor('apps/showcase/src/probe.ts', withTemplate('<div aria-hidden="true" (click)="go()"></div>')), []);
});

test('the verification app is a harness: accessibility rules do not apply to its fixtures', async () => {
    assert.deepEqual(await rulesFor(APP, withTemplate('<input type="text" autofocus /><div (keydown)="go()">x</div>')), []);
});

test('an eslint-disable comment does not silence a finding', async () => {
    const found = await rulesFor(APP, `// eslint-disable-next-line @typescript-eslint/no-explicit-any\nexport const x: any = 1;`);
    assert.ok(found.some((f) => /no-explicit-any/.test(f)), found.join('\n'));
});

const LIB = 'packages/angulux/src/button/probe.ts';

test('forked code is linted for the baseline to judge, except how its public members are declared', async () => {
    const found = await rulesFor(LIB, `import { Input, Output, EventEmitter, ElementRef } from '@angular/core';` + component('@Input() name = ""; @Output() done = new EventEmitter<void>(); constructor(private el: ElementRef) {}') + `\nexport const x: any = 1;`);
    assert.ok(found.some((f) => /no-explicit-any/.test(f)), found.join('\n'));
    assert.ok(found.some((f) => /prefer-inject/.test(f)), found.join('\n'));
    assert.equal(found.some((f) => /prefer-signals|prefer-output-emitter-ref|prefer-signal-model/.test(f)), false, found.join('\n'));
});

test('forked code: skipped tests, empty blocks and focused tests are all reported', async () => {
    const found = await rulesFor('packages/angulux/src/button/probe.spec.ts', `xit('a', () => {});\nfit('b', () => {});\ntry { run(); } catch {}`);
    assert.ok(found.some((f) => /Skipped test/.test(f)), found.join('\n'));
    assert.ok(found.some((f) => /Focused test/.test(f)), found.join('\n'));
    assert.ok(found.some((f) => /no-empty/.test(f)), found.join('\n'));
});

test('an eslint-disable comment in forked code is reported, so the baseline can count it', async () => {
    const [result] = await eslint.lintText(`// eslint-disable-next-line\nexport const x = 1;`, { filePath: join(repoRoot, LIB) });
    assert.deepEqual(result.messages.map(ruleKey), ['inert-eslint-comment']);
});

test('a package that is not forked code is out of scope: no config block applies to it', async () => {
    const config = await eslint.calculateConfigForFile(join(repoRoot, 'packages/angulux-migrate/test/fixtures/probe.ts'));
    assert.equal(config, undefined);
});

// ---- the baseline arithmetic ----

const base = { 'a.ts': { any: 3, inject: 1 }, 'gone.ts': { any: 2 } };

test('baseline: at the allowance is clean', () => {
    const v = compare({ 'a.ts': { any: 3 } }, { 'a.ts': { any: 3 } });
    assert.deepEqual([v.over.length, v.under.length], [0, 0]);
});

test('baseline: one more than frozen is over, and names file and rule', () => {
    const v = compare({ 'a.ts': { any: 3 } }, { 'a.ts': { any: 4 } });
    assert.deepEqual(v.over, [{ file: 'a.ts', rule: 'any', found: 4, allowed: 3 }]);
});

test('baseline: a new file, or a new rule in a frozen file, starts at zero', () => {
    const v = compare(base, { 'a.ts': { any: 3, inject: 1, signals: 1 }, 'gone.ts': { any: 2 }, 'new.ts': { any: 1 } });
    assert.deepEqual(
        v.over.map((o) => `${o.file}/${o.rule}`),
        ['a.ts/signals', 'new.ts/any']
    );
});

test('baseline: fewer than frozen is stale, and so is a file that no longer has findings', () => {
    const v = compare(base, { 'a.ts': { any: 2, inject: 1 } });
    assert.deepEqual(
        v.under.map((u) => `${u.file}/${u.rule} ${u.found}<${u.allowed}`),
        ['a.ts/any 2<3', 'gone.ts/any 0<2']
    );
});

test('baseline: prune lowers and removes, and can never raise or add', () => {
    const next = prune(base, { 'a.ts': { any: 9, inject: 0, signals: 4 }, 'new.ts': { any: 5 } });
    assert.deepEqual(next, { 'a.ts': { any: 3 } });
});

test('baseline: pruning a clean state changes nothing, so the committed file is stable', () => {
    const committed = JSON.parse(readFileSync(join(repoRoot, 'tools/lint-baseline.json'), 'utf8')).files;
    assert.deepEqual(JSON.stringify(prune(committed, committed)), JSON.stringify(committed));
    assert.ok(Object.keys(committed).length > 100, 'the committed baseline is not empty');
    for (const file of Object.keys(committed)) assert.match(file, /^packages\/angulux(-utils|-styled|-styles|-motion)?\/src\//);
});

test('baseline: a focused test never appears in the committed baseline', () => {
    assert.equal(readFileSync(join(repoRoot, 'tools/lint-baseline.json'), 'utf8').includes('focused-test'), false);
});

test('countFindings groups by file and rule key, and labels no-restricted-syntax by its message', () => {
    const found = countFindings([{ file: 'a.ts', messages: [{ ruleId: 'x' }, { ruleId: 'x' }, { ruleId: 'no-restricted-syntax', message: 'Skipped test: `xit` …' }] }, { file: 'b.ts', messages: [] }]);
    assert.deepEqual(found, { 'a.ts': { x: 2, 'no-restricted-syntax/skipped-test': 1 } });
});
