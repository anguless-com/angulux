#!/usr/bin/env node
/**
 * check-signal-forms — the SHIPPED package compiles under Signal Forms' `[formField]`.
 *
 * WHY THIS EXISTS:
 *
 * With `[formField]` on an element, the Angular compiler binds the field's state onto every input
 * of that element whose NAME matches a field property — `min`, `max`, `pattern`, `required`,
 * `disabled`, `invalid`, `touched`, `dirty`, `name`, and the rest — typed as the field declares
 * them. A consumer's template therefore type-checks OUR input declarations against THEIR field
 * types: `min` arrives as the field's own value type (a Date for a date field), `pattern` as
 * `readonly RegExp[]`. BaseInput declared both narrower than that, so `[formField]` on
 * agl-inputnumber, agl-datepicker, agl-select or agl-password was a TS2322 in every consumer
 * build — and a green build here, because nothing in this repository compiles a template the
 * way a consumer does. The library builds with strictTemplates off; the unit tests compile JIT.
 *
 * WHAT IT COMPILES:
 *
 * Three files under `tools/signal-forms/`, as ONE program, against the built declarations in
 * `packages/angulux/dist` (the same `paths` rule check-dts writes out), strict and with
 * `strictTemplates` on — a consumer's program, reproduced:
 *
 *   form-field.ts   `[formField]` on every form control, over number, Date, Date[], string,
 *                   string | null, object, string[] and boolean fields. Must be clean.
 *   attributes.ts   the Reactive Forms, ngModel and attribute bindings users already write.
 *                   Must be clean — widening an input must not break the old spellings.
 *   poison.ts       the negative control. Must fail, with exactly the errors listed below.
 *
 * THE NEGATIVE CONTROL, AND WHY IT IS NOT OPTIONAL:
 *
 * A type-check that produces no errors has proved nothing until it has been seen producing the
 * RIGHT ones. Point a compiler at files whose imports do not resolve, or leave strictTemplates
 * off, and the clean result reads exactly like a pass. So the clean files count only because
 * poison.ts, in the same program, is rejected for the two reasons it was written for: a
 * directive with the old narrow `min` / `pattern` declarations on a `[formField]` element (two
 * TS2322 — the defect class itself), and a bad `variant` on the shipped InputNumber (one TS2322,
 * which only appears if the package's own declarations are the ones being checked). Anything
 * else, or anything less, fails this check even when the clean files are clean.
 *
 * THE COVERAGE RULE:
 *
 * "Every form control" is derived, not listed. The corpus names every declaration that holds a
 * model value; each one with a selector must be bound by a `[formField]` in form-field.ts, or
 * this fails naming it. A module promoted out of the attic cannot join the package without
 * joining the fixture.
 *
 * WHY IT IS NOT ONE OF THE `npm run check` GATES:
 *
 * The same reason as check:dts and check:publishable: it inspects the build output, so it has
 * nothing to look at until `ng build angulux` has run, and that suite exists to answer in three
 * seconds without one.
 *
 * Usage: node tools/check-signal-forms.mjs   (after `pnpm --filter @anguless/angulux run build`)
 */

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const typesDir = join(repoRoot, 'packages/angulux/dist/types');
const fixtureDir = join(repoRoot, 'tools/signal-forms');
const corpusPath = join(repoRoot, 'corpus/corpus.json');

const CLEAN = ['form-field.ts', 'attributes.ts'];
const POISON = 'poison.ts';

const fail = (headline, ...detail) => {
    console.error(`\n✗ ${headline}\n`);
    for (const line of detail) console.error(`  ${line}`);
    console.error('');
    process.exit(1);
};

// ---------------------------------------------------------------------------
// 1. Refuse to run against nothing.
// ---------------------------------------------------------------------------

if (!existsSync(typesDir) || !readdirSync(typesDir).some((f) => f.endsWith('.d.ts'))) {
    fail(
        'there are no shipped declarations to compile against',
        `expected .d.ts files in: ${typesDir}`,
        'Build the library first:  corepack pnpm --filter @anguless/angulux run build',
        'This check reads build output, so it cannot run on a source-only checkout.'
    );
}

for (const file of [...CLEAN, POISON]) {
    if (!existsSync(join(fixtureDir, file))) fail(`fixture missing: tools/signal-forms/${file}`);
}

// Loaded only now: a missing build should be reported as a missing build, not as whatever the
// compiler does first.
const ts = (await import('typescript')).default;
const ng = await import('@angular/compiler-cli');

// ---------------------------------------------------------------------------
// 2. Coverage: every form control the corpus knows of is bound in form-field.ts.
// ---------------------------------------------------------------------------

const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const declarations = corpus.modules.flatMap((m) => m.declarations.map((d) => ({ ...d, module: m.name })));
const byName = new Map(declarations.map((d) => [d.name, d]));

/** The names of every class `d` extends, nearest first. */
function ancestors(d) {
    const chain = [];
    for (let cur = d; cur?.extends; cur = byName.get(cur.extends)) chain.push(cur.extends);
    return chain;
}

// A form control holds a model value. BaseModelHolder is where that starts: InputText and
// Textarea extend it directly, every ControlValueAccessor in the package through
// BaseEditableHolder. The abstract bases themselves have no selector and nothing to bind.
const controls = declarations.filter((d) => d.selector && ancestors(d).includes('BaseModelHolder'));

if (controls.length === 0) {
    fail('the corpus names no form control at all', 'Expected declarations extending BaseModelHolder in corpus/corpus.json.', 'A coverage rule over an empty set passes by construction — that is the failure this refuses.');
}

const formFieldSource = readFileSync(join(fixtureDir, 'form-field.ts'), 'utf8');

/** Start tags that carry `[formField]`, as { tag, attributes }. */
const boundTags = [...formFieldSource.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)]
    .filter((m) => /\[formField\]/.test(m[2]))
    .map((m) => ({ tag: m[1].toLowerCase(), attributes: m[2] }));

/** Does one alternative of a selector (`agl-select`, `[aglInputText]`) match one of those tags? */
function matches(alternative, { tag, attributes }) {
    const attribute = /^\[([\w-]+)\]$/.exec(alternative);
    if (attribute) return new RegExp(`(^|\\s)${attribute[1]}(\\s|=|$)`).test(attributes);
    return alternative.toLowerCase() === tag;
}

const uncovered = controls.filter((d) => !d.selector.split(',').some((alt) => boundTags.some((t) => matches(alt.trim(), t))));

if (uncovered.length) {
    fail(
        `${uncovered.length} form control(s) have no [formField] binding in tools/signal-forms/form-field.ts`,
        ...uncovered.map((d) => `${d.module}: ${d.name}  (${d.selector})`),
        '',
        'Every declaration that holds a model value is a form control a consumer can bind with',
        '[formField]. Add a binding for each one above, with the field types it is used with.'
    );
}

// ---------------------------------------------------------------------------
// 3. The consumer's program: strict, strictTemplates, the built package, all three files.
// ---------------------------------------------------------------------------

const rel = (p) => join(repoRoot, p);
const workDir = mkdtempSync(join(tmpdir(), 'angulux-signal-forms-'));

const config = {
    compilerOptions: {
        target: 'ES2022',
        lib: ['dom', 'dom.iterable', 'ES2022'],
        module: 'ES2022',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
        // Absolute, because this config is written to a temp directory. The same mapping as
        // check-dts: the rule by which dist/<entry>/package.json points at its declarations.
        paths: {
            '@anguless/angulux': [rel('packages/angulux/dist/types/anguless-angulux.d.ts')],
            '@anguless/angulux/types/*': [rel('packages/angulux/dist/types/anguless-angulux-types-*.d.ts')],
            '@anguless/angulux/icons/*': [rel('packages/angulux/dist/types/anguless-angulux-icons-*.d.ts')],
            '@anguless/angulux/*': [rel('packages/angulux/dist/types/anguless-angulux-*.d.ts')]
        }
    },
    angularCompilerOptions: {
        strictTemplates: true,
        strictInjectionParameters: true,
        strictInputAccessModifiers: true
    },
    files: [...CLEAN, POISON].map((f) => join(fixtureDir, f))
};

let result;
try {
    const configPath = join(workDir, 'tsconfig.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    const parsed = ng.readConfiguration(configPath);
    if (parsed.errors.length) {
        fail('the generated tsconfig does not parse', ...parsed.errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')));
    }

    result = ng.performCompilation({ rootNames: parsed.rootNames, options: parsed.options, emitFlags: parsed.emitFlags });
} finally {
    rmSync(workDir, { recursive: true, force: true });
}

const describe = (d) => {
    const file = d.file ? relative(repoRoot, d.file.fileName) : '(no file)';
    const line = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : 0;
    const code = d.code > 0 ? `TS${d.code}` : `NG${String(-d.code).slice(-4)}`;
    return { file, line, code, message: ts.flattenDiagnosticMessageText(d.messageText, ' ') };
};

const found = result.diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error).map(describe);
const poisonPath = relative(repoRoot, join(fixtureDir, POISON));
const unexpected = found.filter((d) => d.file !== poisonPath);

if (unexpected.length) {
    fail(
        `the built package does not compile under [formField] — ${unexpected.length} error(s) outside the negative control`,
        'A consumer with strictTemplates on gets these in their own build:',
        '',
        ...unexpected.slice(0, 40).map((d) => `${d.file}:${d.line}  ${d.code}  ${d.message}`)
    );
}

// ---------------------------------------------------------------------------
// 4. The negative control was rejected, for exactly the reasons it exists.
// ---------------------------------------------------------------------------

const poisonLines = readFileSync(join(fixtureDir, POISON), 'utf8').split('\n');
const lineOf = (needle) => poisonLines.findIndex((l) => l.includes(needle)) + 1;
const narrowLine = lineOf('narrowFieldInputs [formField]');
const variantLine = lineOf(`[variant]="'bogus'"`);

if (!narrowLine || !variantLine) {
    fail('poison.ts no longer contains the two template lines this check looks for', 'Keep `narrowFieldInputs [formField]` and `[variant]="\'bogus\'"` each on its own line.');
}

const expected = [
    { line: narrowLine, code: 'TS2322', says: /RegExp/, why: 'pattern: readonly RegExp[] into a string input' },
    { line: narrowLine, code: 'TS2322', says: /not assignable to type 'number \| null \| undefined'/, why: 'min: the field value type into a number input' },
    { line: variantLine, code: 'TS2322', says: /bogus/, why: "variant: 'bogus' into the shipped InputNumber" }
];

const poisonErrors = found.filter((d) => d.file === poisonPath);
const unmatched = [...poisonErrors];
const missing = [];

for (const want of expected) {
    const at = unmatched.findIndex((d) => d.line === want.line && d.code === want.code && want.says.test(d.message));
    if (at === -1) missing.push(want);
    else unmatched.splice(at, 1);
}

if (missing.length || unmatched.length) {
    fail(
        'the negative control was not rejected the way it has to be, so the clean result means nothing',
        ...missing.map((w) => `missing   poison.ts:${w.line}  ${w.code}  (${w.why})`),
        ...unmatched.map((d) => `unexpected ${d.file}:${d.line}  ${d.code}  ${d.message}`),
        '',
        'Either the program is not type-checking templates strictly, the [formField] bindings are',
        'no longer expanded into named inputs, or the package declarations are not the ones being',
        'read. Treat the clean files as unverified until this is fixed.'
    );
}

// ---------------------------------------------------------------------------
// 5. Report what was examined, not just that nothing failed.
// ---------------------------------------------------------------------------

// TypeScript reports file names with forward slashes on every platform, so compare against the
// same spelling rather than the platform path — on Windows the two would never match.
const shippedPrefix = `${typesDir.split(sep).join('/')}/`;
const shipped = result.program
    ? result.program
          .getTsProgram()
          .getSourceFiles()
          .filter((f) => f.fileName.startsWith(shippedPrefix)).length
    : 0;

if (shipped === 0) {
    fail('the program read no declaration from packages/angulux/dist/types', 'The fixtures resolved @anguless/angulux from somewhere other than the build under test.');
}

console.log(
    `✓ check-signal-forms: ${boundTags.length} [formField] binding(s) covering all ${controls.length} form controls, ` +
        `plus the attribute fixture, compile clean under strictTemplates against ${shipped} shipped .d.ts; ` +
        `the negative control was rejected with its ${expected.length} expected TS2322.`
);
