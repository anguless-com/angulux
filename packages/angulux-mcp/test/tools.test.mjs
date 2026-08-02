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

test('THE OTHER THESIS: the retired template route is answered with the surviving one', () => {
    // `[pTemplate]` used to be how every slot was filled, and it is what a model reaches for.
    // "Does not exist" was true and useless — the caller's next guess is `<p-header>`, which
    // is also gone. Worse, this class of mistake is SILENT: an unmatched template attribute is
    // a plain static attribute, so Angular renders an empty slot and reports nothing.
    const result = call('check_usage', { selector: '[pTemplate]' });

    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /<ng-template #NAME>/);
});

test('the retired facet component is answered with the slot it became', () => {
    const result = call('check_usage', { selector: 'p-header' });

    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /<ng-template #header>/);
});

test('given a module, the retired-route answer names that module\'s real slots', () => {
    const result = call('check_usage', { selector: '[aglTemplate]', module: 'card' });

    assert.equal(result.ok, false);
    // card's five: header, title, subtitle, content, footer.
    assert.match(result.problems.join('\n'), /#subtitle/);
});

test('the same wrong answer passed as an input gets the same right one', () => {
    // A model that thinks of `pTemplate` as an attribute passes it in `inputs`, not `selector`.
    // Falling through to "not an input of any declaration" there would leak the whole point.
    const result = call('check_usage', { module: 'button', inputs: ['pTemplate'] });

    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /<ng-template #NAME>/);
});

test('a real slot name is accepted without complaint', () => {
    assert.deepEqual(call('check_usage', { module: 'card', slots: ['header', 'footer'] }), { ok: true, problems: [] });
});

test('THE SILENT ONE: a slot whose casing is wrong is named, not merely denied', () => {
    // `loadingIconTemplate` reads `<ng-template #loadingicon>`. Deriving the slot from the
    // field gives `#loadingIcon`, Angular matches reference names exactly, and the miss costs
    // nothing at build time and everything at runtime — no error, no warning, an empty slot.
    const result = call('check_usage', { module: 'button', slots: ['loadingIcon'] });
    const answer = result.problems.join('\n');

    assert.equal(result.ok, false);
    assert.match(answer, /#loadingicon/);
    // Both assertions, because the first one alone passed with the feature removed: the
    // fall-through answer lists every slot in the module, `#loadingicon` among them, so it
    // matched by accident. Naming the right spelling somewhere in a list is not the same as
    // telling a caller their own spelling silently binds to nothing.
    assert.doesNotMatch(answer, /has no/, 'a mis-cased slot is a mis-spelling, not a missing slot');
});

test('a slot that does not exist is answered with the ones that do', () => {
    const result = call('check_usage', { module: 'card', slots: ['heder'] });

    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /#header/);
});

test('a long slot list is capped, and the cap is stated', () => {
    // `table` declares more slots than fit in one answer. Printing twelve and stopping quietly
    // would read as the complete list — the same failure the get_module views avoid by naming
    // which view they are.
    const result = call('check_usage', { module: 'table', slots: ['notASlotAtAll'] });

    assert.match(result.problems.join('\n'), /and \d+ more — get_module for the rest/);
});

test('names with nothing to check them against is not a pass', () => {
    // The one verdict this tool must never give. Before, `inputs` without `module` returned
    // `ok: true` having verified nothing at all.
    for (const args of [{ inputs: ['label'] }, { slots: ['header'] }]) {
        const result = call('check_usage', args);
        assert.equal(result.ok, false, JSON.stringify(args));
        assert.match(result.problems.join('\n'), /nothing was verified/);
    }
});

test('search finds a slot under the name a caller writes', () => {
    // Not `loadingIconTemplate` — that is a class member. `#loadingicon` is the thing that goes
    // in the markup, and it is the only spelling that binds.
    const matches = call('search_api', { query: 'loadingicon' }).matches;
    const hit = matches.find((m) => m.kind === 'slot');

    assert.ok(hit, 'a slot search must return slots');
    assert.equal(hit.member, '#loadingicon');
    assert.equal(hit.module, 'button');
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

test('corpus_info says the version trails npm on purpose, so nobody reads it as staleness', () => {
    // The checkout says 22.0.0-rc.0 while npm serves 22.1.0, because a release stamps the
    // version in CI and does not commit it back. The API behind the two numbers is identical,
    // and a caller who reads the gap as a stale server goes and regenerates a correct corpus.
    const info = call('corpus_info');

    assert.match(info.libraryVersionNote, /sourceHash/);
    assert.match(info.libraryVersionNote, /trails npm|not the published one/);
});

test('a summary is a fraction of the full module, and says which view it is', () => {
    // Dogfooding found get_module('table') returning 71 KB in one tool result — 25
    // declarations, 83 inputs on one of them. Correct, contract-satisfying, and far too much
    // to hand an assistant that asked what the component is called.
    const full = call('get_module', { name: 'table' });
    const summary = call('get_module', { name: 'table', summary: true });

    assert.equal(full.view, 'full');
    assert.equal(summary.view, 'summary');

    const fullBytes = JSON.stringify(full).length;
    const summaryBytes = JSON.stringify(summary).length;
    assert.ok(summaryBytes * 10 < fullBytes, `summary ${summaryBytes} is not << full ${fullBytes}`);
});

test('a summary reports member counts and omits the members themselves', () => {
    const summary = call('get_module', { name: 'table', summary: true });
    const table = summary.module.declarations.find((d) => d.name === 'Table');

    assert.equal(table.inputCount, 83);
    assert.ok(table.outputCount > 0);
    assert.ok(!('inputs' in table), 'a summary must not carry the arrays it claims to omit');
});

test('a summary names its slots even though it only counts everything else', () => {
    // The asymmetry is deliberate. A slot name is short and unguessable; a caller holding a
    // count would still have to spend a second call to learn the one thing they cannot infer.
    const summary = call('get_module', { name: 'card', summary: true });
    const card = summary.module.declarations.find((d) => d.name === 'Card');

    assert.deepEqual(card.slots, ['header', 'title', 'subtitle', 'content', 'footer']);
});

test('one declaration can be fetched in full without its 24 siblings', () => {
    const one = call('get_module', { name: 'table', declaration: 'ColumnFilter' });

    assert.equal(one.view, 'declaration');
    assert.equal(one.module.declarations.length, 1);
    assert.equal(one.module.declarations[0].name, 'ColumnFilter');
    assert.ok(one.module.declarations[0].inputs.length > 0, 'the one you asked for keeps its detail');
});

test('asking for a declaration that does not exist lists what does', () => {
    const miss = call('get_module', { name: 'button', declaration: 'DataTable' });

    assert.equal(miss.found, false);
    assert.match(miss.reason, /ButtonDirective/);
});

test('every view still satisfies the contract', () => {
    for (const args of [{ name: 'table' }, { name: 'table', summary: true }, { name: 'table', declaration: 'Table' }]) {
        assert.deepEqual(validateToolResult('get_module', call('get_module', args)), [], JSON.stringify(args));
    }
});
