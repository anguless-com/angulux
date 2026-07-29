import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadCorpus } from '../src/corpus.mjs';
import { createTools } from '../src/tools.mjs';
import { TOOL_NAMES, validateToolResult } from '../src/contract.mjs';

const corpus = loadCorpus();
const tools = createTools(corpus);
const call = (name, input = {}) => tools[name].handler(input);

test('the server implements exactly the tools the contract names', () => {
    assert.deepEqual(Object.keys(tools).sort(), [...TOOL_NAMES].sort());
    for (const name of TOOL_NAMES) {
        assert.equal(typeof tools[name].description, 'string');
        assert.ok(tools[name].description.length > 20, `${name} needs a description a model can act on`);
        assert.equal(typeof tools[name].inputSchema, 'object');
    }
});

test('every tool returns a payload its own contract accepts', () => {
    const inputs = {
        list_modules: {},
        get_module: { name: 'button' },
        search_api: { query: 'size' },
        check_usage: { selector: 'agl-button' },
        corpus_info: {}
    };
    for (const name of TOOL_NAMES) {
        assert.deepEqual(validateToolResult(name, call(name, inputs[name])), [], `${name} violated the contract`);
    }
});

test('list_modules covers the whole warranted closure, and can hide the empty ones', () => {
    assert.equal(call('list_modules').modules.length, 64);

    const withApi = call('list_modules', { withApiOnly: true }).modules;
    assert.ok(withApi.length > 0 && withApi.length < 64);
    assert.ok(withApi.every((m) => m.declarationCount > 0));
});

test('an attic module is an explicit miss, never an empty success', () => {
    // `accordion` is real, popular, and NOT in the warranted closure. Answering with an empty
    // module record would read as "supported, declares nothing" and get it recommended.
    const result = call('get_module', { name: 'accordion' });

    assert.equal(result.found, false);
    assert.match(result.reason, /closure|supported/i);
});

test('a module that genuinely declares nothing is found, and says so', () => {
    // The opposite case, and the reason the previous one matters: `api` IS supported and
    // really has no renderable surface. Both must be distinguishable.
    const result = call('get_module', { name: 'api' });

    assert.equal(result.found, true);
    assert.deepEqual(result.module.declarations, []);
});

test('THE THESIS: check_usage rejects the PrimeNG selector and names the angulux one', () => {
    const result = call('check_usage', { selector: 'p-button' });

    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /agl-button/);
});

test('…and accepts the real one without complaint', () => {
    assert.deepEqual(call('check_usage', { selector: 'agl-button' }), { ok: true, problems: [] });
});

test('an unscoped import specifier is rejected — it does not resolve', () => {
    const result = call('check_usage', { entrypoint: 'angulux/button' });

    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /@anguless\/angulux\/button/);
});

test('a deprecated input is flagged with its replacement, not silently accepted', () => {
    // 69 inputs are deprecated. Accepting one without comment is how an assistant ends up
    // recommending an API we have moved away from.
    const result = call('check_usage', { module: 'button', inputs: ['label'] });

    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /deprecat/i);
});

test('an input that does not exist is reported as not existing', () => {
    const result = call('check_usage', { module: 'button', inputs: ['definitelyNotAnInput'] });

    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /definitelyNotAnInput/);
});

test('search finds a real member and says where it lives', () => {
    const matches = call('search_api', { query: 'iconPos' }).matches;

    assert.ok(matches.length > 0);
    const hit = matches.find((m) => m.member === 'iconPos');
    assert.equal(hit.module, 'button');
    assert.equal(hit.kind, 'input');
});

test('search is bounded and deterministic', () => {
    // An unbounded search over 1205 inputs would blow the caller's context; two identical
    // calls returning different orders would make the whole thing untestable.
    const first = call('search_api', { query: 'a', limit: 5 });
    const second = call('search_api', { query: 'a', limit: 5 });

    assert.equal(first.matches.length, 5);
    assert.deepEqual(first, second);
});

test('corpus_info reports the provenance a caller needs to spot a stale server', () => {
    const info = call('corpus_info');

    assert.equal(info.sourceHash, corpus.sourceHash);
    assert.equal(info.libraryVersion, corpus.libraryVersion);
    assert.equal(info.closureCount, 64);
});
