/**
 * contract — the shape of `corpus/corpus.json`, and the only place that shape is defined.
 *
 * WHY THIS IS HAND-ROLLED AND NOT A JSON SCHEMA. `ajv` is resolvable in this workspace at
 * 8.20.0, but it is **not in any manifest** — it arrives transitively. Building a gate on a
 * package nothing declares is precisely the drift the constitution's exact-pin rule (P4)
 * and the dependency-drift gotcha exist to prevent: the day something upstream stops
 * depending on ajv, this gate disappears rather than fails. The validation needed here is a
 * few dozen lines, so it costs less than the dependency would.
 *
 * WHY A CORPUS RECORD LOOKS LIKE THIS. Reading `button.ts` before writing any of it changed
 * the shape twice, and both corrections matter:
 *
 *   1. A module is NOT one component. `button` alone declares four things — `ButtonLabel`,
 *      `ButtonIcon` and `ButtonDirective` (directives) plus `Button` (a component), each
 *      with its own selector. A record with a single `selector` field would have described
 *      one quarter of the module and looked complete doing it.
 *   2. Inputs carry `@deprecated`. `label`, `icon` and `buttonProps` are all deprecated in
 *      favour of directives. An assistant that cannot see that will confidently recommend
 *      the deprecated API — which is the failure this whole feature exists to prevent.
 *
 * The `defaultDeclared` flag is the honesty valve. Only 136 of 1038 inputs declare
 * `@defaultValue`, so "the docs do not state a default" is the NORMAL case. Omitting the
 * field would let a model fill the silence with a PrimeNG default; saying `null` plus
 * `defaultDeclared: false` states the ignorance out loud.
 */

const DECLARATION_KINDS = new Set(['component', 'directive']);

const isString = (v) => typeof v === 'string';
const isBool = (v) => typeof v === 'boolean';

function checkInput(input, where, problems, { isOutput = false } = {}) {
    // `name` is what a CALLER writes and `field` is what the class calls it. They differ for
    // 58 members here — `@Input('aglAutoFocus') autofocus` and `input(…, { alias: 'aglSize' })`
    // — and recording only the property name described an API a template cannot use: binding
    // to an unknown attribute is silent, so nothing would have reported it. Both are required
    // for the same reason slots require both: the module's JSDoc and its specs speak in field
    // names, so an answer naming only one of the two cannot be checked against the source.
    for (const field of ['name', 'field', 'type', 'description']) {
        if (!isString(input[field])) problems.push(`${where}: ${field} must be a string`);
    }
    if (input.group !== null && !isString(input.group)) {
        problems.push(`${where}: group must be a string or null`);
    }
    if (input.deprecated !== null && !isString(input.deprecated)) {
        problems.push(`${where}: deprecated must be the reason string, or null`);
    }
    if (isOutput) return;

    if (!isBool(input.defaultDeclared)) {
        problems.push(`${where}: defaultDeclared must be a boolean`);
    }
    if (!isBool(input.signal)) {
        problems.push(`${where}: signal must be a boolean (Angular has two input styles)`);
    }
    // The honesty invariant, stated as an assertion rather than a convention.
    if (input.defaultDeclared === false && input.default !== null) {
        problems.push(`${where}: defaultDeclared is false but default is not null`);
    }
}

/**
 * Validate a whole corpus document.
 *
 * @param {unknown} corpus parsed JSON, exactly as it sits on disk
 * @returns {string[]} human-readable problems; an empty array means valid
 */
export function validateCorpus(corpus) {
    const problems = [];

    if (corpus === null || typeof corpus !== 'object') {
        return ['corpus must be an object'];
    }

    const { generator, modules } = corpus;
    if (generator === null || typeof generator !== 'object') {
        problems.push('generator block is missing');
    } else {
        if (!isString(generator.version)) problems.push('generator.version must be a string');
        // A content hash of the files that fed the corpus, NOT a commit SHA. A HEAD SHA
        // would change on every commit and make the byte-identical drift gate fail on all of
        // them — manufacturing the drift it exists to detect.
        if (!isString(generator.sourceHash) || !/^[0-9a-f]{64}$/.test(generator.sourceHash)) {
            problems.push('generator.sourceHash must be a sha256 hex digest');
        }
        if (!Number.isInteger(generator.closureCount)) {
            problems.push('generator.closureCount must be an integer');
        }
    }

    if (!Array.isArray(modules)) {
        problems.push('modules must be an array');
        return problems;
    }

    for (const [index, module] of modules.entries()) {
        const at = `modules[${index}]`;
        if (!isString(module.name)) problems.push(`${at}: name must be a string`);
        // The name a reader IMPORTS. Not a declaration — an NgModule has no selector, no
        // inputs and no slots, and listing it among them would pad the corpus with rows
        // nobody can use. But it is the one thing needed before anything else on the page
        // can be: `label` on `agl-button` is worth nothing without `ButtonModule`. An empty
        // array is a real answer — `icons` exports standalone components and has none.
        if (!Array.isArray(module.ngModules)) {
            problems.push(`${at}: ngModules must be an array`);
        } else if (!module.ngModules.every(isString)) {
            problems.push(`${at}: every ngModules entry must be a string`);
        }
        // `null` is a real answer, not a missing field: a module without `ng-package.json` has
        // no bare entry point, and saying so beats printing one that throws on import.
        if (module.entrypoint !== null && !isString(module.entrypoint)) {
            problems.push(`${at}: entrypoint must be a string or null`);
        }
        if (!isString(module.description)) problems.push(`${at}: description must be a string`);

        if (!Array.isArray(module.declarations)) {
            problems.push(`${at}: declarations must be an array`);
            continue;
        }

        for (const [d, declaration] of module.declarations.entries()) {
            const dAt = `${at}.declarations[${d}] (${declaration?.name ?? '?'})`;
            if (!isString(declaration.name)) problems.push(`${dAt}: name must be a string`);
            if (!DECLARATION_KINDS.has(declaration.kind)) {
                problems.push(`${dAt}: kind must be one of ${[...DECLARATION_KINDS].join(', ')}`);
            }
            if (!isString(declaration.selector)) problems.push(`${dAt}: selector must be a string`);
            // Angular inherits inputs, and this library leans on that: `BaseInput` alone
            // publishes ten, so `min` and `max` are real on `agl-inputNumber` while appearing
            // nowhere in its own entry. Naming the parent is enough — the bases are
            // `@Directive`s with entries of their own, so a renderer resolves it against this
            // same corpus. `null` is a real answer for a class that extends nothing.
            if (declaration.extends !== null && !isString(declaration.extends)) {
                problems.push(`${dAt}: extends must be the base class name, or null`);
            }

            for (const [key, isOutput] of [
                ['inputs', false],
                ['outputs', true]
            ]) {
                if (!Array.isArray(declaration[key])) {
                    problems.push(`${dAt}: ${key} must be an array`);
                    continue;
                }
                for (const [i, member] of declaration[key].entries()) {
                    checkInput(member, `${dAt}.${key}[${i}] (${member?.name ?? '?'})`, problems, { isOutput });
                }
            }

            // Slots are a THIRD member kind, not a flavour of input. `<ng-template #header>` is
            // content projection: it is filled in the caller's markup, carries no type and no
            // default, and cannot be set programmatically. Validating it through checkInput
            // would have meant inventing `type`, `default` and `signal` fields for it — the
            // corpus would then state four facts about every slot, three of them made up.
            if (!Array.isArray(declaration.slots)) {
                problems.push(`${dAt}: slots must be an array`);
            } else {
                for (const [s, slot] of declaration.slots.entries()) {
                    const sAt = `${dAt}.slots[${s}] (${slot?.name ?? '?'})`;
                    if (slot === null || typeof slot !== 'object') {
                        problems.push(`${sAt}: must be an object`);
                        continue;
                    }
                    // `name` is what the caller writes after the `#`; `field` is what the module
                    // reads it back as. Both, because the two differ in three modules and every
                    // answer that names only one of them is uncheckable against the source.
                    for (const field of ['name', 'field', 'description']) {
                        if (!isString(slot[field])) problems.push(`${sAt}: ${field} must be a string`);
                    }
                    if (slot.deprecated !== null && !isString(slot.deprecated)) {
                        problems.push(`${sAt}: deprecated must be the reason string, or null`);
                    }
                }
            }
        }
    }

    return problems;
}
