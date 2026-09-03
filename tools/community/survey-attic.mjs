import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Surveys packages/angulux/attic and rewrites docs/attic-promotion.md.
 *
 * The table is DERIVED, never hand-maintained: a promotion moves a directory out of attic/
 * and every count on that page moves with it. Typing them by hand is how a contributor ends
 * up choosing a module against numbers that stopped being true two releases ago.
 *
 *   node tools/community/survey-attic.mjs
 *
 * Run it after any promotion and commit the diff alongside the closure regeneration.
 */
const ATTIC = 'packages/angulux/attic';
const SRC = 'packages/angulux/src';
const EOL = '\r\n';

const inSrc = new Set(readdirSync(SRC, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name));
const mods = readdirSync(ATTIC, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

const walk = (dir, pred, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, pred, out);
        else if (pred(e.name)) out.push(p);
    }
    return out;
};
const loc = (files) => files.reduce((n, f) => n + readFileSync(f, 'utf8').split(/\r?\n/).length, 0);

const info = {};
for (const m of mods) {
    const dir = join(ATTIC, m);
    const src = walk(dir, (n) => n.endsWith('.ts') && !n.endsWith('.spec.ts'));
    const spec = walk(dir, (n) => n.endsWith('.spec.ts'));
    const text = src.map((f) => readFileSync(f, 'utf8')).join('\n');
    const specText = spec.map((f) => readFileSync(f, 'utf8')).join('\n');

    const deps = new Set();
    for (const mm of text.matchAll(/from\s+['"](?:primeng|@anguless\/angulux)\/([a-z0-9-]+)/g)) deps.add(mm[1]);
    deps.delete(m);

    const ext = new Set();
    if (/from\s+['"]@angular\/cdk/.test(text)) ext.add('cdk');

    // A dynamic import is invisible to a static scan AND to a syntax-matching rename codemod.
    // Split by where it lands: shipped code is a runtime dependency nobody declared; a spec is
    // a test that breaks after promotion. Same class, very different cost.
    const dyn = new Set();
    for (const mm of text.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        if (!mm[1].startsWith('primeng/') && !mm[1].startsWith('@anguless/')) dyn.add(mm[1]);
    }
    const specDyn = new Set();
    for (const mm of specText.matchAll(/import\(\s*['"](primeng\/[^'"]+)['"]\s*\)/g)) specDyn.add(mm[1]);

    info[m] = {
        deps: [...deps].sort(),
        ext: [...ext],
        dyn: [...dyn].sort(),
        specDyn: [...specDyn].sort(),
        srcLoc: loc(src),
        specLoc: loc(spec),
        hasSpec: spec.length > 0,
        risky: (text.match(/ChangeDetectionStrategy\.(Eager|Default)/g) || []).length
    };
}

const drag = (m) => {
    const seen = new Set();
    const stack = [...info[m].deps];
    while (stack.length) {
        const d = stack.pop();
        if (inSrc.has(d) || seen.has(d) || d === m || !info[d]) continue;
        seen.add(d);
        stack.push(...info[d].deps);
    }
    return [...seen].sort();
};

const rows = mods.map((m) => {
    const dragged = drag(m);
    const ext = new Set(info[m].ext);
    const dyn = new Set(info[m].dyn);
    const specDyn = new Set(info[m].specDyn);
    for (const d of dragged) {
        for (const e of info[d].ext) ext.add(e);
        for (const x of info[d].dyn) dyn.add(x);
        for (const x of info[d].specDyn) specDyn.add(x);
    }
    return {
        m,
        dragged,
        ext: [...ext],
        dyn: [...dyn],
        specDyn: [...specDyn],
        loc: info[m].srcLoc + dragged.reduce((n, d) => n + info[d].srcLoc, 0),
        spec: info[m].specLoc + dragged.reduce((n, d) => n + info[d].specLoc, 0),
        hasSpec: info[m].hasSpec,
        risky: info[m].risky + dragged.reduce((n, d) => n + info[d].risky, 0)
    };
});
rows.sort(
    (a, b) =>
        a.dragged.length - b.dragged.length ||
        a.ext.length - b.ext.length ||
        (a.hasSpec === b.hasSpec ? 0 : a.hasSpec ? -1 : 1) ||
        a.loc - b.loc
);

const BT = '`';
const notesFor = (r) => {
    const n = [];
    if (r.ext.length) n.push('needs ' + BT + '@angular/cdk' + BT);
    for (const d of r.dyn) n.push('runtime ' + BT + d + BT + ' via dynamic import, undeclared');
    for (const u of r.specDyn) n.push('spec dynamic-imports ' + BT + u + BT + ' as a string');
    if (!r.hasSpec) n.push('**no inherited spec**');
    return n.length ? n.join('; ') : '—';
};

const md = [
    '# Promoting a module out of `attic/`',
    '',
    `This library ships **${inSrc.size}** of PrimeNG's 117 modules. The other **${mods.length}** are inherited verbatim`,
    'from PrimeNG 21.1.9 and live in [`packages/angulux/attic/`](../packages/angulux/attic/):',
    'the source is kept, the build excludes them. That is documented behaviour rather than a gap —',
    'the warranted set is the transitive closure of what a real application actually imported, and',
    'everything outside it was cut so that the guarantee could mean something.',
    '',
    'Promoting one is the most useful contribution this project can receive. This page exists so',
    'the choice can be made on cost rather than on whichever component someone happened to notice.',
    '',
    '## How to read the table',
    '',
    '- **Drags in** — other attic modules the promotion pulls with it. Only three drag anything;',
    '  the dependency graph out here is unusually flat.',
    '- **Cost notes** — everything that makes a promotion more than move-rename-regenerate. This',
    '  column is the point of the table.',
    '- **LOC / Spec** — source lines excluding specs, and the inherited spec lines that come with',
    '  it. No inherited spec means writing tests from scratch, which is usually the larger job.',
    '- **Risky** — `@Component`s declaring `ChangeDetectionStrategy.Eager`/`.Default`. Each one has',
    '  to be reached by the browser gate or `check:risk-coverage` fails, correctly.',
    '',
    '## The checklist',
    '',
    'From [the promotion issue template](../.github/ISSUE_TEMPLATE/module_promotion.yml):',
    '',
    '1. Move `attic/<name>/` → `src/<name>/`.',
    '2. Rename selectors to `agl-*` / `agl*`. **CSS class names `p-*` stay** — see [NOTICE](../NOTICE).',
    '3. Regenerate the closure (`node tools/scope/gen-closure.mjs`) and include the diff.',
    "4. `npm run check` green, the module's inherited specs passing, and `npm run test:tools`.",
    '5. If the module carries a risky decorator, extend the browser gate.',
    '6. Move every counted claim by one: the module-count assertions `npm run test:tools`',
    '   checks, the `corpusSourceHash` in the MCP benchmark, this page (regenerate it, do',
    '   not edit it), and the prose counts in the README and the issue templates.',
    '',
    'Two traps worth knowing before you start. The attic is **un-renamed** — its imports still say',
    '`primeng/*` — so the rename codemod has to run over it. And a promotion may need upstream',
    'attribute names added to `selectors.json`, or `check:names` stays blind to them in templates.',
    '',
    `## All ${mods.length}, cheapest first`,
    '',
    '| Module | Drags in | Cost notes | LOC | Spec | Risky |',
    '|---|---|---|---:|---:|---:|'
];

for (const r of rows) {
    md.push(
        '| ' + BT + r.m + BT + ' | ' +
            (r.dragged.length ? r.dragged.map((d) => BT + d + BT).join(', ') : '—') + ' | ' +
            notesFor(r) + ' | ' +
            r.loc + ' | ' +
            (r.hasSpec ? r.spec : '—') + ' | ' +
            (r.risky || '—') + ' |'
    );
}

const clean = rows.filter((r) => !r.dragged.length && !r.ext.length && !r.dyn.length && !r.specDyn.length && r.hasSpec);
const noSpec = rows.filter((r) => !r.hasSpec);
const needCdk = rows.filter((r) => r.ext.length);
const runtimeDyn = rows.filter((r) => r.dyn.length);
const specDynRows = rows.filter((r) => r.specDyn.length);

md.push(
    '',
    '## Summary',
    '',
    '- **' + clean.length + ' of ' + mods.length + '** drag nothing, need no external dependency, and arrive with an',
    '  inherited spec suite. Those are move-rename-regenerate jobs.',
    '- **' + noSpec.length + '** have no inherited spec — ' +
        noSpec.map((r) => BT + r.m + BT).join(', ') + '. Budget for writing tests.',
    '- **' + needCdk.length + '** need `@angular/cdk`, a peer this project dropped deliberately' +
        ' (' + needCdk.map((r) => BT + r.m + BT).join(', ') + '). Reinstating it is a scope decision,',
    '  not a promotion.',
    '- **' + runtimeDyn.length + '** carry a runtime dependency loaded by dynamic `import()`, which',
    '  no static scan and no manifest declares. `editor` is the case: it does `import(\'quill\')`,',
    '  and nothing in this workspace mentions Quill — promoting it without adding a peer dependency',
    '  ships a component that fails the first time a user opens it.',
    '- **' + specDynRows.length + '** dynamic-import an un-renamed `primeng/*` path **from inside the',
    '  inherited spec** (' + (specDynRows.map((r) => BT + r.m + BT).join(', ') || 'none') + '). No',
    '  source file does this. A rename codemod matching syntax cannot see a string and neither can',
    '  the type checker, so the spec breaks after promotion — cheaper than the same bug in shipped',
    '  code, because it fails immediately, but worth knowing before a green codemod is read as a',
    '  green module.',
    '',
    '<!-- Generated by tools/community/survey-attic.mjs. Do not edit this table by hand: run',
    '     node tools/community/survey-attic.mjs after a promotion and commit the diff. Every',
    '     number on this page comes off the filesystem, which is why none of them is written by',
    '     hand. -->'
);

mkdirSync('docs', { recursive: true });
writeFileSync('docs/attic-promotion.md', md.join(EOL) + EOL, 'utf8');

const t = readFileSync('docs/attic-promotion.md', 'utf8');
console.log('rows:', rows.length, '| clean:', clean.length, '| noSpec:', noSpec.length, '| cdk:', needCdk.length, '| runtimeDyn:', runtimeDyn.length, '| specDyn:', specDynRows.length);
console.log('bare LF:', (t.match(/(?<!\r)\n/g) || []).length);
console.log('lines:', t.split(EOL).length);
