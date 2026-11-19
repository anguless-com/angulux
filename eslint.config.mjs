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
 *   apps/showcase, apps/verify, e2e   code written here, for Angular 22 → the full set
 *   every *.spec.ts in packages/      one rule only: no focused test
 *
 * The library source in `packages/angulux/src` is deliberately OUT of scope. It is forked
 * code that keeps its inherited shape until the Angular 23 trip (decorator inputs,
 * constructor injection, `*ngIf`): thousands of findings that are a migration, not a lint
 * error. Linting it here would mean freezing a baseline nobody reads.
 *
 * WHAT IS LEFT OFF, and why, so nobody adds it back on a hunch:
 *   - the template accessibility rules on `apps/verify`: that app is a harness of fixtures
 *     that reproduce defects on purpose (an `autofocus` attribute, a wrapper that listens for
 *     keys), not an interface anyone uses. They are on for the showcase, which is public.
 *   - `prefer-ngsrc`: the showcase is prerendered to static files and ships no image loader
 *   - `FormsModule`: the showcase demonstrates template-driven forms on purpose
 *   - skipped and expected-failing tests: the library carries skips inherited from upstream
 *     and e2e carries two documented `test.fail()`; only FOCUSED tests are refused, because a
 *     focused test silently turns the rest of the suite off
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

/** Angular 22 conventions with no dedicated rule. */
const CONVENTIONS = [
    { selector: 'Decorator Property[key.name="standalone"][value.value=true]', message: '`standalone: true` is the default since Angular 19. Remove the line.' },
    { selector: 'Decorator Property[key.name="changeDetection"] MemberExpression[property.name="OnPush"]', message: 'OnPush is the default in Angular 22. Remove the line.' },
    { selector: 'CallExpression[callee.property.name="mutate"]', message: 'Signals have no `mutate`. Use `set` or `update` with a new value.' }
];

const typescript = {
    languageOptions: { parser: tseslint.parser, parserOptions: { sourceType: 'module' } },
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' }
};

export default [
    { ignores: ['**/node_modules/**', '**/dist/**', '**/.angular/**', '**/attic/**', 'ref/**', '**/generated/**', '**/*.generated.ts'] },

    // Code written here: the full set.
    {
        files: ['apps/showcase/**/*.ts', 'apps/verify/**/*.ts', 'e2e/**/*.ts'],
        ...typescript,
        plugins: { '@angular-eslint': angular.tsPlugin, '@typescript-eslint': tseslint.plugin },
        processor: angular.processInlineTemplates,
        rules: {
            'no-restricted-syntax': ['error', ...CONVENTIONS, ...FOCUSED],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/ban-ts-comment': 'error',
            '@angular-eslint/prefer-standalone': 'error',
            // The written rule asks for signal inputs and queries; it does not ask for
            // `readonly` on every signal property, which is what the default also reports.
            '@angular-eslint/prefer-signals': ['error', { preferReadonlySignalProperties: false }],
            '@angular-eslint/prefer-signal-model': 'error',
            '@angular-eslint/prefer-output-emitter-ref': 'error',
            '@angular-eslint/prefer-inject': 'error',
            '@angular-eslint/prefer-host-metadata-property': 'error'
        }
    },

    // Templates, external and inline (the processor above extracts inline ones as *.html).
    {
        files: ['apps/showcase/**/*.html', 'apps/verify/**/*.html'],
        languageOptions: { parser: angular.templateParser },
        linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
        plugins: { '@angular-eslint/template': angular.templatePlugin },
        rules: {
            '@angular-eslint/template/prefer-control-flow': 'error',
            '@angular-eslint/template/prefer-class-binding': 'error',
            '@angular-eslint/template/prefer-style-binding': 'error'
        }
    },

    // The public site: static accessibility. What a parser can see without rendering; the
    // rendered page is the browser gate's business.
    {
        files: ['apps/showcase/**/*.html'],
        rules: {
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
        }
    },

    // Every spec in the packages, inherited or not: one rule.
    {
        files: ['packages/**/*.spec.ts'],
        ...typescript,
        rules: { 'no-restricted-syntax': ['error', ...FOCUSED] }
    }
];
