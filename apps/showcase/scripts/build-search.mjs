/**
 * The index the site's search reads, sliced out of the committed corpus like the API payloads.
 *
 * It holds names only: every module, every declaration with its selector, and every input,
 * output and slot under the declaration that publishes it. Descriptions and types stay in the
 * per-module payloads, where the page a result leads to shows them. That keeps the file small
 * enough to fetch the moment someone opens search, and never before: the home page does not
 * download it.
 *
 * Inherited members are listed once, under the class that declares them, not under each of the
 * classes that extend it. `BaseComponent` alone has 93 subclasses.
 *
 * Shape, by position rather than by key, because the keys would be most of the bytes:
 *   modules:      [name, declares[]]
 *   declarations: [moduleIndex, name, kind ('c' | 'd'), selector]
 *   members:      [declarationIndex, kind ('i' | 'o' | 's'), name]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(resolve(HERE, '../../../corpus/corpus.json'), 'utf8'));
const OUT = resolve(HERE, '../public');

const modules = [];
const declarations = [];
const members = [];

corpus.modules.forEach((module, moduleIndex) => {
    modules.push([module.name, module.declarations.map((declaration) => declaration.name)]);

    for (const declaration of module.declarations) {
        const declarationIndex = declarations.length;

        declarations.push([moduleIndex, declaration.name, declaration.kind === 'directive' ? 'd' : 'c', declaration.selector]);

        for (const input of declaration.inputs) members.push([declarationIndex, 'i', input.name]);
        for (const output of declaration.outputs) members.push([declarationIndex, 'o', output.name]);
        for (const slot of declaration.slots) members.push([declarationIndex, 's', slot.name]);
    }
});

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'search.json'), JSON.stringify({ modules, declarations, members }));

console.log(`search: ${modules.length} modules, ${declarations.length} declarations, ${members.length} inputs, outputs and slots`);
