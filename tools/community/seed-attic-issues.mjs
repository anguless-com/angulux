#!/usr/bin/env node
/**
 * seed-attic-issues — turn the attic into an actual contributor funnel.
 *
 * WHY THIS EXISTS: the README, CONTRIBUTING and the issue templates all say "promoting a
 * module out of attic/ is the most useful contribution you can make". On a repository with
 * an empty issue tracker that sentence does nothing: nobody browses a source tree looking
 * for work. The 53 modules only become contributable when each one is an issue with a
 * title, a scope, and a `good first issue` label.
 *
 * It reads the attic directly rather than a hand-maintained list, so it cannot drift: a
 * promoted module disappears from attic/ and therefore from this tool's output.
 *
 * Prints to stdout by default. Creates nothing without --create, and skips modules that
 * already have an open issue, so it is safe to re-run after each promotion.
 *
 * Usage:
 *   node tools/community/seed-attic-issues.mjs                # preview all
 *   node tools/community/seed-attic-issues.mjs --json         # machine-readable
 *   node tools/community/seed-attic-issues.mjs --create       # create them (needs gh)
 *   node tools/community/seed-attic-issues.mjs --create --only tree,editor
 *   node tools/community/seed-attic-issues.mjs --create --limit 10
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ATTIC = join(repoRoot, 'packages/angulux/attic');
const SRC = join(repoRoot, 'packages/angulux/src');
const REPO = 'anguless-com/angulux';

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? null : args[i + 1];
};

if (!existsSync(ATTIC)) {
    console.error(`✗ attic not found at ${ATTIC}`);
    process.exit(1);
}

/**
 * Modules whose promotion is genuinely harder than the rest, with the reason stated.
 * Labelling one of these `good first issue` would be dishonest — someone would take it,
 * discover the real shape three evenings in, and quite reasonably not come back.
 */
const HARD = {
    editor: 'wraps a third-party rich-text engine; check that dependency\'s license before starting',
    tree: 'large surface, and treeselect/treetable interact with it',
    treeselect: 'depends on tree being promoted first',
    organizationchart: 'complex SVG/layout code with little test coverage upstream',
    picklist: 'needs listbox first, and upstream used @angular/cdk drag-drop',
    orderlist: 'needs listbox first, and upstream used @angular/cdk drag-drop',
    listbox: 'large selection/keyboard-navigation surface, and other modules build on it',
    dragdrop: 'upstream leaned on @angular/cdk, which this project deliberately dropped as a peer',
    galleria: 'large, and overlaps with image/imagecompare',
    carousel: 'touch/gesture behaviour that the browser gate must be extended to cover',
    dynamicdialog: 'creates components at runtime — needs browser-gate coverage, not just specs',
    passthrough: 'cross-cutting API surface rather than a component'
};

/** Modules that unblock others. Worth saying out loud so effort lands where it multiplies. */
const UNBLOCKS = {
    listbox: ['picklist', 'orderlist'],
    tree: ['treeselect']
};

const isDir = (p) => {
    try {
        return statSync(p).isDirectory();
    } catch {
        return false;
    }
};

const modules = readdirSync(ATTIC)
    .filter((n) => !n.startsWith('.') && isDir(join(ATTIC, n)))
    .sort();

const shipped = new Set(isDir(SRC) ? readdirSync(SRC).filter((n) => isDir(join(SRC, n))) : []);

/** Rough size signal, so nobody picks a "first issue" that is 4000 lines. */
function measure(name) {
    const dir = join(ATTIC, name);
    let files = 0;
    let lines = 0;
    const walk = (d) => {
        for (const entry of readdirSync(d)) {
            const p = join(d, entry);
            if (isDir(p)) walk(p);
            else if (/\.(ts|html|css|scss)$/.test(entry)) {
                files++;
                lines += readFileSync(p, 'utf8').split('\n').length;
            }
        }
    };
    walk(dir);
    return { files, lines };
}

function buildIssue(name) {
    const { files, lines } = measure(name);
    const hard = HARD[name];
    const unblocks = UNBLOCKS[name];

    const labels = ['attic-promotion', 'enhancement'];
    if (!hard && lines < 1200) labels.push('good first issue');

    const size = lines < 600 ? 'small' : lines < 1800 ? 'medium' : 'large';

    const body = `The \`${name}\` module sits in [\`packages/angulux/attic/${name}/\`](https://github.com/${REPO}/tree/main/packages/angulux/attic/${name}) — verbatim PrimeNG 21.1.9 source, MIT, unmodified, **not built and not published**.

This issue tracks promoting it into the shipped set.

**Size:** ${size} — ${files} source files, roughly ${lines} lines.${
        hard
            ? `\n\n**Not a beginner task:** ${hard}`
            : ''
    }${
        unblocks
            ? `\n\n**Promoting this unblocks:** ${unblocks.map((u) => `\`${u}\``).join(', ')}. Worth doing early.`
            : ''
    }

### What "done" means

1. Move \`attic/${name}/\` → \`src/${name}/\`.
2. Rename selectors to the \`agl-*\` / \`agl*\` convention. **CSS class names \`p-*\` stay** — that distinction is deliberate, see [NOTICE](https://github.com/${REPO}/blob/main/NOTICE).
3. Regenerate the closure (\`node tools/scope/gen-closure.mjs\`) and include the diff. Promoting a module changes the warranted set, and \`check:scope\` fails if the two disagree.
4. \`npm run check\` green (7/7), and this module's inherited specs passing.
5. If the module carries a risk-flagged decorator, extend the browser gate — otherwise \`check:risk-coverage\` fails, correctly.

### Before you start

- Comment here so nobody duplicates the work.
- Read [CONTRIBUTING.md](https://github.com/${REPO}/blob/main/CONTRIBUTING.md) — the **provenance clause** is a hard requirement. Derive from the attic source or from upstream 21.1.9, both MIT and both already in this repository. Do not port from PrimeNG 22.
- Some attic modules depend on others, and a few needed \`@angular/cdk\`, which this project deliberately dropped as a peer. If you hit that, say so in the pull request — it is a design decision, not a blocker to route around quietly.
`;

    return { name, title: `feat(attic): promote ${name} out of the attic`, labels, body, size, lines };
}

// ---------------------------------------------------------------------------

let selected = modules.filter((m) => !shipped.has(m));
const alreadyShipped = modules.filter((m) => shipped.has(m));

const only = valueOf('--only');
if (only) {
    const wanted = new Set(only.split(',').map((s) => s.trim()));
    selected = selected.filter((m) => wanted.has(m));
}

const limit = valueOf('--limit');
if (limit) selected = selected.slice(0, Number(limit));

const issues = selected.map(buildIssue);

if (has('--json')) {
    console.log(JSON.stringify(issues, null, 2));
    process.exit(0);
}

if (!has('--create')) {
    console.log(`\n${issues.length} attic module(s) would get an issue.\n`);
    const firstIssues = issues.filter((i) => i.labels.includes('good first issue'));
    console.log(`  good first issue : ${firstIssues.length}`);
    console.log(`  needs experience : ${issues.length - firstIssues.length}\n`);
    for (const i of issues) {
        const tag = i.labels.includes('good first issue') ? 'first' : '     ';
        console.log(`  [${tag}] ${i.name.padEnd(22)} ${String(i.lines).padStart(5)} lines  (${i.size})`);
    }
    if (alreadyShipped.length) {
        console.log(`\n  ! present in BOTH attic/ and src/, skipped: ${alreadyShipped.join(', ')}`);
        console.log('    That usually means a promotion left a copy behind — worth checking.');
    }
    console.log('\nNothing was created. Re-run with --create to open them.\n');
    process.exit(0);
}

// --- creation path ---------------------------------------------------------

try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'pipe' });
} catch {
    console.error('✗ gh is not installed or not authenticated.');
    process.exit(1);
}

// Never open a second issue for the same module. This is what makes the tool re-runnable
// after each promotion instead of a one-shot that floods the tracker on a mistake.
const existing = new Set(
    JSON.parse(
        execFileSync('gh', ['issue', 'list', '--repo', REPO, '--label', 'attic-promotion', '--state', 'all', '--limit', '200', '--json', 'title'], {
            encoding: 'utf8'
        })
    ).map((i) => i.title)
);

let created = 0;
let skipped = 0;

for (const issue of issues) {
    if (existing.has(issue.title)) {
        console.log(`  = skip    ${issue.name} (issue already exists)`);
        skipped++;
        continue;
    }
    const url = execFileSync(
        'gh',
        ['issue', 'create', '--repo', REPO, '--title', issue.title, '--body', issue.body, ...issue.labels.flatMap((l) => ['--label', l])],
        { encoding: 'utf8' }
    ).trim();
    console.log(`  + created ${issue.name.padEnd(22)} ${url}`);
    created++;
}

console.log(`\n✓ ${created} created, ${skipped} skipped.\n`);
