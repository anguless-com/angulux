import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderLlmsTxt, BASE_URL } from '../render-llms.mjs';
import { buildCorpus } from '../generate.mjs';

const corpus = buildCorpus();
const text = () => renderLlmsTxt(corpus);

/**
 * Checked against the llms.txt specification, not against how it looks.
 *
 * The spec (llmstxt.org) is precise about structure: an H1 — "the only required section" —
 * then a blockquote summary, then optional prose containing no headings, then zero or more
 * H2-delimited sections whose bodies are markdown lists of links. A renderer that produced
 * something merely markdown-shaped would read fine to a human and be wrong for the consumer
 * that matters.
 */

test('exactly one H1, and it is the first line', () => {
    const lines = text().split('\n');
    const h1s = lines.filter((line) => /^# /.test(line));

    assert.equal(h1s.length, 1);
    assert.match(lines[0], /^# /);
});

test('a blockquote summary follows the H1', () => {
    const lines = text().split('\n').filter((line) => line.trim() !== '');
    assert.match(lines[1], /^> /);
});

test('no heading deeper than H2 — the spec allows H1 and H2 sections only', () => {
    assert.doesNotMatch(text(), /^#{3,} /m);
});

test('every list item in every section is a markdown link', () => {
    // "a markdown list, containing a required markdown hyperlink [name](url), then optionally
    // a `:` and notes". A bare bullet is not a file-list entry.
    const items = text().split('\n').filter((line) => line.startsWith('- '));

    assert.ok(items.length > 0, 'no list items at all');
    for (const item of items) {
        assert.match(item, /^- \[[^\]]+\]\([^)]+\)/, `not a link entry: ${item}`);
    }
});

test('every link is absolute, because an assistant fetches it out of context', () => {
    const urls = [...text().matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);

    assert.ok(urls.length > 0);
    for (const url of urls) assert.match(url, /^https:\/\//, `relative URL: ${url}`);
});

test('every warranted module is linked exactly once', () => {
    const urls = [...text().matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    const moduleUrls = urls.filter((u) => u.endsWith('.md'));

    assert.equal(moduleUrls.length, corpus.modules.length);
    assert.equal(new Set(moduleUrls).size, moduleUrls.length, 'a module is linked twice');
    for (const module of corpus.modules) {
        assert.ok(moduleUrls.includes(`${BASE_URL}${module.name}.md`), `${module.name} is not linked`);
    }
});

test('the summary states what Angulux is and which Angular it targets', () => {
    // The blockquote is the only context a model gets before deciding whether to read on.
    // "Angular" and the major version are the two facts that make the rest interpretable.
    const summary = text().split('\n').find((line) => line.startsWith('> '));

    assert.match(summary, /Angular/);
    assert.match(summary, /22/);
});

test('deprecated inputs are surfaced in the index, not buried in a page', () => {
    // 69 inputs are deprecated. An assistant that only reads llms.txt should still be warned
    // that the surface contains deprecated API, or it will recommend one confidently.
    assert.match(text(), /deprecated/i);
});

test('the output is LF-only', () => {
    assert.doesNotMatch(text(), /\r/);
});
