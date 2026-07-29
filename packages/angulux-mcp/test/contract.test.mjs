import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TOOL_NAMES, validateToolResult } from '../src/contract.mjs';

/**
 * The tool payloads are a WIRE BOUNDARY — JSON-RPC over stdio. A type checker cannot see
 * across it, and neither can a unit test that imports a handler and inspects its return
 * value. So the shape is pinned here first, before any tool exists to shape it accidentally,
 * and the live probe later asserts the REAL payloads against these same rules.
 *
 * The fixtures below are minimal by design; the tool tests feed real corpus data through the
 * same validator, so shape and substance are checked in different places.
 */

const valid = {
    list_modules: { modules: [{ name: 'button', entrypoint: '@anguless/angulux/button', declarationCount: 4 }] },
    get_module: {
        found: true,
        view: 'full',
        module: { name: 'button', entrypoint: '@anguless/angulux/button', description: '', declarations: [] }
    },
    search_api: { matches: [{ module: 'button', declaration: 'Button', member: 'size', kind: 'input' }] },
    check_usage: { ok: false, problems: ['selector `p-button` is PrimeNG; angulux uses `agl-button`'] },
    corpus_info: {
        libraryVersion: '22.0.0-rc.0',
        sourceHash: 'a'.repeat(64),
        closureCount: 64,
        generatedFormatVersion: '1'
    }
};

test('every tool named in the contract has a fixture, and it validates', () => {
    assert.deepEqual([...TOOL_NAMES].sort(), Object.keys(valid).sort());
    for (const [name, payload] of Object.entries(valid)) {
        assert.deepEqual(validateToolResult(name, payload), [], `${name} fixture should be valid`);
    }
});

test('an unknown tool name is rejected rather than waved through', () => {
    assert.match(validateToolResult('get_component', {}).join('\n'), /unknown tool/);
});

test('ok:true must carry no problems — the two cannot disagree', () => {
    // The whole point of check_usage is a verdict a caller can trust. "Fine, but here are
    // three problems" is not a verdict, it is a contradiction.
    const problems = validateToolResult('check_usage', { ok: true, problems: ['something is wrong'] });
    assert.match(problems.join('\n'), /ok is true but problems is not empty/);
});

test('a miss is an explicit found:false, never an empty success', () => {
    // An attic module must not come back as `{found: true, module: null}` or as a bare empty
    // object — a reader cannot tell that from "this module exists and declares nothing".
    assert.deepEqual(validateToolResult('get_module', { found: false, reason: 'not in the warranted closure' }), []);
    assert.match(validateToolResult('get_module', { found: true }).join('\n'), /module/);
    assert.match(validateToolResult('get_module', { found: false }).join('\n'), /reason/);
});

test('provenance is a real digest, so a stale corpus is detectable', () => {
    const short = { ...valid.corpus_info, sourceHash: 'abc123' };
    assert.match(validateToolResult('corpus_info', short).join('\n'), /sourceHash/);
});

test('declarationCount is an integer, not a string that looks like one', () => {
    const bad = { modules: [{ name: 'button', entrypoint: '@anguless/angulux/button', declarationCount: '4' }] };
    assert.match(validateToolResult('list_modules', bad).join('\n'), /declarationCount/);
});

test('a search match names where it came from, or it is not actionable', () => {
    const bad = { matches: [{ module: 'button', member: 'size', kind: 'input' }] };
    assert.match(validateToolResult('search_api', bad).join('\n'), /declaration/);
});

test('every entrypoint the server hands out is the scoped, resolvable one', () => {
    // The R0 bug that shipped and had to be fixed: `angulux/button` does not resolve.
    const bad = { modules: [{ name: 'button', entrypoint: 'angulux/button', declarationCount: 4 }] };
    assert.match(validateToolResult('list_modules', bad).join('\n'), /@anguless\/angulux\//);
});

test('a get_module response must say which view it is', () => {
    const noView = { found: true, module: valid.get_module.module };
    assert.match(validateToolResult('get_module', noView).join('\n'), /view must be one of/);
});

test('a summary cannot smuggle in the members it claims to have omitted', () => {
    // If a "summary" carried the full arrays, the caller would pay full price for a response
    // labelled cheap — and would have no way to know.
    const sneaky = {
        found: true,
        view: 'summary',
        module: {
            name: 'button',
            entrypoint: '@anguless/angulux/button',
            description: '',
            declarations: [{ name: 'Button', kind: 'component', selector: 'agl-button', inputCount: 1, outputCount: 0, inputs: [] }]
        }
    };
    assert.match(validateToolResult('get_module', sneaky).join('\n'), /must omit inputs\/outputs/);
});

test('a summary without counts is not a summary', () => {
    const countless = {
        found: true,
        view: 'summary',
        module: {
            name: 'button',
            entrypoint: '@anguless/angulux/button',
            description: '',
            declarations: [{ name: 'Button', kind: 'component', selector: 'agl-button' }]
        }
    };
    assert.match(validateToolResult('get_module', countless).join('\n'), /inputCount/);
});

test('a "declaration" view carrying more than one declaration is rejected', () => {
    const two = {
        found: true,
        view: 'declaration',
        module: {
            name: 'button',
            entrypoint: '@anguless/angulux/button',
            description: '',
            declarations: [
                { name: 'Button', kind: 'component', selector: 'agl-button', inputs: [], outputs: [] },
                { name: 'ButtonDirective', kind: 'directive', selector: '[aglButton]', inputs: [], outputs: [] }
            ]
        }
    };
    assert.match(validateToolResult('get_module', two).join('\n'), /2 declarations were returned/);
});
