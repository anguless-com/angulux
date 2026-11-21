/**
 * ESLint, as a gate and not as a style guide.
 *
 * Every rule here states something this repository already wrote down as prose (the
 * `angulux` skill, CONTRIBUTING.md) and that the scanned code already obeyed when the rule
 * was switched on: each was measured at ZERO findings first. Nothing here is a preference
 * being introduced; it is a habit being made impossible to break quietly.
 *
 * SCOPE, by ownership:
 *
 *   apps/showcase, apps/verify, e2e   code written here, for Angular 22 → the full set,
 *                                     at zero findings
 *   packages/angulux/src and the      forked code → the same set plus skipped tests and
 *   four forked packages              empty blocks, against a FROZEN BASELINE
 *
 * The forked code keeps its inherited shape until the Angular 23 trip (decorator inputs,
 * constructor injection, `*ngIf`, `any`). Those findings are a migration, not a lint error,
 * so they are not fixed here and not reported: `tools/lint-baseline.json` records how many
 * of each rule every file had on the day it was frozen. (How inputs, outputs and queries
 * are declared is not linted there at all; see the block.) A file may have fewer. It may never
 * have more, and a new file starts at zero. The baseline only shrinks; `check:lint` fails
 * when it is stale, so a fix also has to give its allowance back.
 *
 * WHAT IS LEFT OFF, and why, so nobody adds it back on a hunch:
 *   - the template accessibility rules on `apps/verify`: that app is a harness of fixtures
 *     that reproduce defects on purpose (an `autofocus` attribute, a wrapper that listens for
 *     keys), not an interface anyone uses. They are on for the showcase, which is public.
 *   - `prefer-ngsrc`: the showcase is prerendered to static files and ships no image loader
 *   - `FormsModule`: the showcase demonstrates template-driven forms on purpose
 *   - expected-failing tests in e2e: two documented `test.fail()` assert a defect that is
 *     still open. Skipped tests in the packages are counted against the baseline.
 *
 * `noInlineConfig` is on: an `eslint-disable` comment does nothing, so the only way to
 * change what this gate accepts is to change this file, in review.
 *
 * Run through `npm run check:lint` (tools/check-lint.mjs), which also refuses to report
 * clean when a scanned tree turned out empty.
 */

import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

/** A focused test passes alone and hides every other test in its file. */
const FOCUSED = [
    { selector: 'CallExpression[callee.name=/^(fdescribe|fit)$/]', message: 'Focused test: `fdescribe`/`fit` turns every other test in the run off. Use `describe`/`it`.' },
    {
        selector: 'CallExpression[callee.property.name="only"][callee.object.name=/^(describe|it|test)$/], CallExpression[callee.property.name="only"][callee.object.object.name=/^(describe|it|test)$/]',
        message: 'Focused test: `.only` turns every other test in the run off. Remove it.'
    }
];

/** A skipped test is a test that stopped testing. Frozen in the packages, where upstream left some. */
const SKIPPED = [
    { selector: 'CallExpression[callee.name=/^(xdescribe|xit)$/]', message: 'Skipped test: `xdescribe`/`xit` no longer tests anything. Fix it or delete it with the reason in the commit.' },
    {
        selector: 'CallExpression[callee.property.name=/^(skip|fixme)$/][callee.object.name=/^(describe|it|test)$/], CallExpression[callee.property.name=/^(skip|fixme)$/][callee.object.object.name=/^(describe|it|test)$/]',
        message: 'Skipped test: `.skip`/`.fixme` no longer tests anything. Fix it or delete it with the reason in the commit.'
    }
];

/** Angular 22 conventions with no dedicated rule. */
const CONVENTIONS = [
    { selector: 'Decorator Property[key.name="standalone"][value.value=true]', message: 'Redundant standalone: `standalone: true` is the default since Angular 19. Remove the line.' },
    { selector: 'Decorator Property[key.name="changeDetection"] MemberExpression[property.name="OnPush"]', message: 'Redundant OnPush: OnPush is the default in Angular 22. Remove the line.' },
    { selector: 'CallExpression[callee.property.name="mutate"]', message: 'Signal mutate: signals have no `mutate`. Use `set` or `update` with a new value.' }
];

const typescript = {
    languageOptions: { parser: tseslint.parser, parserOptions: { sourceType: 'module' } },
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' }
};

/** The Angular 22 shape, in TypeScript. */
const TS_RULES = {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': 'error',
    '@angular-eslint/prefer-standalone': 'error',
    // The written rule asks for signal inputs and queries; it does not ask for `readonly`
    // on every signal property, which is what the default also reports.
    '@angular-eslint/prefer-signals': ['error', { preferReadonlySignalProperties: false }],
    '@angular-eslint/prefer-signal-model': 'error',
    '@angular-eslint/prefer-output-emitter-ref': 'error',
    '@angular-eslint/prefer-inject': 'error',
    '@angular-eslint/prefer-host-metadata-property': 'error',
    // A root singleton is written `@Service()`. The rule leaves alone what `@Service` cannot
    // express (`providedIn` other than 'root', `useFactory`, constructor parameters).
    '@angular-eslint/prefer-service-decorator': 'error',
    // `CommonModule` pulls every common directive and pipe into a component that uses one.
    'no-restricted-imports': ['error', { paths: [{ name: '@angular/common', importNames: ['CommonModule'], message: 'Import only what the template uses (`JsonPipe`, `NgTemplateOutlet`, …); `@if`/`@for` need no import at all.' }] }]
};

/** The Angular 22 shape, in templates. */
const TEMPLATE_RULES = {
    '@angular-eslint/template/prefer-control-flow': 'error',
    '@angular-eslint/template/prefer-class-binding': 'error',
    '@angular-eslint/template/prefer-style-binding': 'error'
};

/** Static accessibility: what a parser can see without rendering. */
const A11Y_RULES = {
    '@angular-eslint/template/alt-text': 'error',
    '@angular-eslint/template/elements-content': 'error',
    '@angular-eslint/template/label-has-associated-control': 'error',
    '@angular-eslint/template/interactive-supports-focus': 'error',
    '@angular-eslint/template/click-events-have-key-events': 'error',
    '@angular-eslint/template/mouse-events-have-key-events': 'error',
    '@angular-eslint/template/role-has-required-aria': 'error',
    '@angular-eslint/template/valid-aria': 'error',
    '@angular-eslint/template/table-scope': 'error',
    '@angular-eslint/template/no-positive-tabindex': 'error',
    '@angular-eslint/template/no-autofocus': 'error',
    '@angular-eslint/template/no-distracting-elements': 'error',
    '@angular-eslint/template/button-has-type': 'error'
};

/** The forked code that is held to the baseline. Kept in step with tools/check-lint.mjs. */
const FORKED = ['packages/angulux/src', 'packages/angulux-utils/src', 'packages/angulux-styled/src', 'packages/angulux-styles/src', 'packages/angulux-motion/src'];

export default [
    { ignores: ['**/node_modules/**', '**/dist/**', '**/.angular/**', '**/attic/**', 'ref/**', '**/generated/**', '**/*.generated.ts'] },

    // Code written here: the full set.
    {
        files: ['apps/showcase/**/*.ts', 'apps/verify/**/*.ts', 'e2e/**/*.ts'],
        ...typescript,
        plugins: { '@angular-eslint': angular.tsPlugin, '@typescript-eslint': tseslint.plugin },
        processor: angular.processInlineTemplates,
        rules: { 'no-restricted-syntax': ['error', ...CONVENTIONS, ...FOCUSED], ...TS_RULES }
    },

    // Templates, external and inline (the processor above extracts inline ones as *.html).
    {
        files: ['apps/showcase/**/*.html', 'apps/verify/**/*.html'],
        languageOptions: { parser: angular.templateParser },
        linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
        plugins: { '@angular-eslint/template': angular.templatePlugin },
        rules: TEMPLATE_RULES
    },

    // The public site: static accessibility. The rendered page is the browser gate's business.
    { files: ['apps/showcase/**/*.html'], rules: A11Y_RULES },

    // Forked code, against the baseline: the same shape, plus skips and empty blocks.
    {
        files: FORKED.map((dir) => `${dir}/**/*.ts`),
        ...typescript,
        plugins: { '@angular-eslint': angular.tsPlugin, '@typescript-eslint': tseslint.plugin },
        processor: angular.processInlineTemplates,
        rules: {
            'no-restricted-syntax': ['error', ...CONVENTIONS, ...FOCUSED, ...SKIPPED],
            'no-empty': 'error',
            ...TS_RULES,
            // Off here, on purpose. These three decide how an input, an output or a query is
            // DECLARED, which is the public surface `check:api-surface` freezes. A fix that
            // adds an input to a decorator-based component follows the file it is in (#198
            // did); converting a component is the Angular 23 trip, done whole, not one
            // member at a time under pressure from a counter.
            '@angular-eslint/prefer-signals': 'off',
            '@angular-eslint/prefer-signal-model': 'off',
            '@angular-eslint/prefer-output-emitter-ref': 'off'
        }
    },
    {
        files: FORKED.map((dir) => `${dir}/**/*.html`),
        languageOptions: { parser: angular.templateParser },
        linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
        plugins: { '@angular-eslint/template': angular.templatePlugin },
        rules: { ...TEMPLATE_RULES, ...A11Y_RULES }
    }
];
