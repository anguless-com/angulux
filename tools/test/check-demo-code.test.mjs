import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHOWCASE_IMPORT_RE, demoId, extractCard, parseRegistry } from '../../apps/showcase/scripts/demo-lib.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = (p) => join(repoRoot, p);

/**
 * The gate behind the documentation site's one real promise: the code shown to a reader is
 * the code that ran. That promise holds because `build-demos.mjs` EXTRACTS the snippet from
 * the demo instead of accepting a written one — and extraction only works while the demo
 * files keep the shape it cuts on. Nothing about that shape is visible to TypeScript, so a
 * demo that loses its card div, a page entry pointing at a different file than it names, and
 * a demo for a module no release contains all compile and all publish something false.
 *
 * The generator and the gate share `demo-lib.mjs` for exactly this reason: two definitions of
 * "a valid demo" would drift, and the drift would surface as a green build with a wrong site.
 */

test('the card div is the cut, and nesting inside it survives', () => {
    const source = `template: \`
        <div class="card">
            <div class="inner">
                <agl-button label="Submit" />
            </div>
        </div>
    \``;

    const { template, error } = extractCard(source);

    assert.equal(error, null);
    assert.equal(template, '<div class="inner">\n    <agl-button label="Submit" />\n</div>', 'nested divs must not end the cut early, and the body is dedented');
});

test('every way a demo can stop being extractable is a reported error, not a silent empty', () => {
    // Silence is the failure mode that matters: an empty snippet renders as an empty code
    // block, which reads as "this demo needs no code" rather than as a defect.
    assert.match(extractCard('template: `<agl-button />`').error, /no <div class="card">/);
    assert.match(extractCard('template: `<div class="card"><agl-button />`').error, /never closed/);
    assert.match(extractCard('template: `<div class="card">   </div>`').error, /card is empty/);
});

test('a demo id is derived from where the file lives, never declared inside it', () => {
    // A declared id can disagree with its location. A derived one cannot, which is what makes
    // "the page asked for X and got X's code" true by construction.
    assert.equal(demoId('button', 'basic-doc.ts'), 'button-basic');
    assert.equal(demoId('button', 'iconsonly-doc.ts'), 'button-iconsonly');
});

test('a demo importing the site is caught — that is what makes verbatim publishing safe', () => {
    assert.ok(SHOWCASE_IMPORT_RE.test("import { DemoCode } from '../../components/demo-code';"));
    assert.ok(!SHOWCASE_IMPORT_RE.test("import { ButtonModule } from '@anguless/angulux/button';"));
});

test('the registry is read as text, and yields the four literals the gate compares', () => {
    const source = `
export const DEMO_SECTIONS = {
    button: [
        {
            id: 'button-basic',
            label: 'Basic',
            description: 'x',
            load: () => import('./button/basic-doc').then((m) => m.BasicDoc)
        }
    ]
};`;

    assert.deepEqual(parseRegistry(source), [{ module: 'button', id: 'button-basic', label: 'Basic', importPath: './button/basic-doc', exportName: 'BasicDoc' }]);
});

test('the gate runs green and reports what it actually covered', () => {
    const out = execFileSync(process.execPath, [at('tools/check-demo-code.mjs')], { cwd: repoRoot, encoding: 'utf8' });

    assert.match(out, /✓ check-demo-code: \d+ demo\(s\) across \d+ module\(s\), all extractable, all reachable, all shipped\./);
});
