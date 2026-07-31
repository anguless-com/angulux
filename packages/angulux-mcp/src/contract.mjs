/**
 * contract — the shape of every tool result this server returns, in one place.
 *
 * These payloads cross JSON-RPC over stdio. That boundary is invisible to a type checker,
 * and a unit test that calls a handler directly never touches it either — so the shape is
 * pinned here and asserted twice: once against fixtures, once against the real bytes coming
 * back over the wire in the live probe.
 *
 * Hand-rolled for the same reason as the corpus contract: `ajv` resolves in this workspace
 * but is in no manifest, and a gate built on an undeclared package disappears the day
 * something upstream drops it.
 *
 * Two invariants here are the server's whole reason to exist, not incidental validation:
 *
 *   - `ok: true` must carry no problems. A verdict that says "fine, but here are three
 *     problems" is not a verdict, and `check_usage` exists to give a caller a verdict.
 *   - A miss is an explicit `found: false` with a reason. If an out-of-scope module came
 *     back as an empty success, an assistant could not tell "unsupported" from "supported
 *     but declares nothing" — and would confidently tell someone to use it.
 */

export const TOOL_NAMES = ['list_modules', 'get_module', 'search_api', 'check_usage', 'corpus_info'];

const SCOPE = '@anguless/angulux/';

/** What a `get_module` response is: everything, an overview, or one declaration in full. */
const VIEWS = new Set(['full', 'summary', 'declaration']);

const isString = (v) => typeof v === 'string';
const isBool = (v) => typeof v === 'boolean';

function checkModuleSummary(entry, where, problems) {
    if (!isString(entry?.name)) problems.push(`${where}: name must be a string`);
    // `null` means the module has no bare entry point at all (no `ng-package.json`, so
    // ng-packagr never emits one). Handing back a specifier that throws on import is worse
    // than admitting there is none — the same reasoning as the scope check just below.
    if (entry?.entrypoint === null) {
        // nothing to validate; absence is the claim
    } else if (!isString(entry?.entrypoint)) {
        problems.push(`${where}: entrypoint must be a string or null`);
    } else if (!entry.entrypoint.startsWith(SCOPE)) {
        // The R0 defect that shipped: `angulux/button` does not resolve. The package is
        // scoped, and an import specifier that fails is worse than no answer at all.
        problems.push(`${where}: entrypoint "${entry.entrypoint}" must start with ${SCOPE}`);
    }
    if (!Number.isInteger(entry?.declarationCount)) {
        problems.push(`${where}: declarationCount must be an integer`);
    }
}

const VALIDATORS = {
    list_modules(payload, problems) {
        if (!Array.isArray(payload?.modules)) {
            problems.push('modules must be an array');
            return;
        }
        payload.modules.forEach((entry, i) => checkModuleSummary(entry, `modules[${i}]`, problems));
    },

    get_module(payload, problems) {
        if (!isBool(payload?.found)) {
            problems.push('found must be a boolean');
            return;
        }
        if (!payload.found) {
            if (!isString(payload.reason)) {
                problems.push('found is false but no reason was given — a caller needs to know why');
            }
            return;
        }

        // The response says WHICH view it is. `table` carries 25 declarations and 83 inputs on
        // one of them — 71 KB in a single tool result — so a caller needs a cheap way to look
        // before it fetches. Silently truncating a "full" response would be worse than the
        // size: the caller could not tell a small module from a trimmed one.
        if (!VIEWS.has(payload.view)) {
            problems.push(`view must be one of ${[...VIEWS].join(', ')}`);
        }

        const module = payload.module;
        if (module === null || typeof module !== 'object') {
            problems.push('found is true but module is missing');
            return;
        }

        checkModuleSummary(
            { ...module, declarationCount: Array.isArray(module.declarations) ? module.declarations.length : null },
            'module',
            problems
        );
        if (!isString(module.description)) problems.push('module.description must be a string');
        if (!Array.isArray(module.declarations)) {
            problems.push('module.declarations must be an array');
            return;
        }

        module.declarations.forEach((declaration, i) => {
            const at = `module.declarations[${i}] (${declaration?.name ?? '?'})`;
            if (!isString(declaration?.name)) problems.push(`${at}: name must be a string`);
            if (!isString(declaration?.selector)) problems.push(`${at}: selector must be a string`);

            if (payload.view === 'summary') {
                // A summary must carry counts, so the caller can judge the cost of fetching
                // the detail — and must NOT carry the member arrays it claims to have omitted.
                if (!Number.isInteger(declaration?.inputCount)) problems.push(`${at}: inputCount must be an integer`);
                if (!Number.isInteger(declaration?.outputCount)) problems.push(`${at}: outputCount must be an integer`);
                if ('inputs' in declaration || 'outputs' in declaration) {
                    problems.push(`${at}: a summary must omit inputs/outputs, not include them`);
                }
            } else {
                if (!Array.isArray(declaration?.inputs)) problems.push(`${at}: inputs must be an array`);
                if (!Array.isArray(declaration?.outputs)) problems.push(`${at}: outputs must be an array`);
            }
        });

        if (payload.view === 'declaration' && module.declarations.length !== 1) {
            problems.push(`view is "declaration" but ${module.declarations.length} declarations were returned`);
        }
    },

    search_api(payload, problems) {
        if (!Array.isArray(payload?.matches)) {
            problems.push('matches must be an array');
            return;
        }
        payload.matches.forEach((match, i) => {
            for (const field of ['module', 'declaration', 'member', 'kind']) {
                if (!isString(match?.[field])) problems.push(`matches[${i}]: ${field} must be a string`);
            }
        });
    },

    check_usage(payload, problems) {
        if (!isBool(payload?.ok)) problems.push('ok must be a boolean');
        if (!Array.isArray(payload?.problems)) {
            problems.push('problems must be an array');
            return;
        }
        if (payload.problems.some((p) => !isString(p))) problems.push('every problem must be a string');
        if (payload.ok === true && payload.problems.length > 0) {
            problems.push('ok is true but problems is not empty — a verdict cannot contradict itself');
        }
    },

    corpus_info(payload, problems) {
        if (!isString(payload?.libraryVersion)) problems.push('libraryVersion must be a string');
        if (!isString(payload?.generatedFormatVersion)) problems.push('generatedFormatVersion must be a string');
        if (!Number.isInteger(payload?.closureCount)) problems.push('closureCount must be an integer');
        if (!isString(payload?.sourceHash) || !/^[0-9a-f]{64}$/.test(payload.sourceHash)) {
            problems.push('sourceHash must be a sha256 hex digest — it is how a caller detects a stale corpus');
        }
    }
};

/**
 * Validate one tool's result payload.
 *
 * @param {string} toolName one of TOOL_NAMES
 * @param {unknown} payload the object the tool returned
 * @returns {string[]} human-readable problems; empty means valid
 */
export function validateToolResult(toolName, payload) {
    const validator = VALIDATORS[toolName];
    if (!validator) return [`unknown tool "${toolName}" — the contract covers ${TOOL_NAMES.join(', ')}`];

    if (payload === null || typeof payload !== 'object') return [`${toolName}: payload must be an object`];

    const problems = [];
    validator(payload, problems);
    return problems;
}
