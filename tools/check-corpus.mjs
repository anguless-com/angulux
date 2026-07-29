#!/usr/bin/env node
/**
 * check-corpus — the committed corpus must be what the generator produces, byte for byte.
 *
 * WHY THIS EXISTS. `corpus/corpus.json` is generated from the library's own source and then
 * committed, which makes it the one kind of file that goes stale silently: nothing breaks
 * when it drifts. The library keeps building, the tests keep passing, and the corpus quietly
 * describes an API that moved months ago — while an MCP server and a docs site read it as
 * the truth. A generated artifact that is not regenerated in CI is a lie with a timestamp.
 *
 * WHAT IT ASKS, in order, cheapest question last:
 *
 *   1. Does the committed file still satisfy the contract? A hand-edit can keep a file
 *      parseable and plausible while breaking the shape two consumers rely on.
 *   2. Does it describe exactly the warranted closure? Set equality in both directions, so a
 *      dropped module and an invented one both fail. Counting would pass while one module
 *      was swapped for another.
 *   3. Is it byte-identical to a fresh generation?
 *
 * WHY BYTE COMPARISON IS SAFE HERE. Two things make it stable rather than flaky: the
 * generator normalises the line endings it reads, and `.gitattributes` pins `corpus/*.json`
 * to LF so a CRLF checkout cannot produce a file the LF-emitting generator can never match.
 * Both were found the hard way — see the T4 commit.
 *
 * It prints the number of modules compared. "✓ clean" cannot be told apart from "I compared
 * nothing"; a count can.
 *
 * Usage: node tools/check-corpus.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCorpus, serialise } from './corpus/generate.mjs';
import { validateCorpus } from './corpus/contract.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMMITTED = resolve(repoRoot, 'corpus/corpus.json');
const CLOSURE = resolve(repoRoot, 'tools/scope/closure.json');

const fail = (lines) => {
    console.error('\n✗ THE COMMITTED CORPUS IS NOT WHAT THE GENERATOR PRODUCES\n');
    for (const line of lines) console.error(`  ${line}`);
    console.error('\n  Regenerate with:  node tools/corpus/generate.mjs');
    console.error('  The corpus is generated, never hand-edited — an edit here is lost on the next run.\n');
    process.exit(1);
};

if (!existsSync(COMMITTED)) {
    fail(['corpus/corpus.json does not exist']);
}

const committedText = readFileSync(COMMITTED, 'utf8');

let committed;
try {
    committed = JSON.parse(committedText);
} catch (error) {
    fail([`corpus/corpus.json is not valid JSON: ${error.message}`]);
}

const contractProblems = validateCorpus(committed);
if (contractProblems.length) {
    fail(['the committed corpus does not satisfy the contract:', ...contractProblems.map((p) => `  - ${p}`)]);
}

const closure = JSON.parse(readFileSync(CLOSURE, 'utf8')).closure;
const documented = new Set(committed.modules.map((m) => m.name));
const missing = closure.filter((name) => !documented.has(name));
const invented = [...documented].filter((name) => !closure.includes(name));

if (missing.length || invented.length) {
    fail([
        ...missing.map((name) => `warranted module absent from the corpus: ${name}`),
        ...invented.map((name) => `corpus documents a module outside the warranted closure: ${name}`)
    ]);
}

const fresh = serialise(buildCorpus());

if (fresh !== committedText) {
    const limit = Math.min(fresh.length, committedText.length);
    let at = 0;
    while (at < limit && fresh[at] === committedText[at]) at += 1;

    fail([
        `committed ${committedText.length} bytes, generated ${fresh.length} bytes`,
        `first difference at byte ${at}`,
        `  committed: ${JSON.stringify(committedText.slice(at, at + 60))}`,
        `  generated: ${JSON.stringify(fresh.slice(at, at + 60))}`
    ]);
}

const declarations = committed.modules.reduce((n, m) => n + m.declarations.length, 0);
const inputs = committed.modules.reduce((n, m) => n + m.declarations.reduce((k, d) => k + d.inputs.length, 0), 0);

console.log(
    `✓ check-corpus: ${committed.modules.length} modules, ${declarations} declarations, ${inputs} inputs — ` +
        `byte-identical to a fresh generation, and equal to the warranted closure.`
);
