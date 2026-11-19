// The two measuring tools (tools/measure-size.mjs, tools/measure-load.mjs) report numbers that
// decisions get made on. What is tested here is the arithmetic around the measurement — which
// entry points get a row, whose bytes are whose, what "shared by all" means — because a wrong
// attribution reads exactly like a right one.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { allowance, attribute, compressed, entryPoints, family, heaviestInputs, judge, owner, pruneBaseline, sharedInputs } from '../lib/size-measure.mjs';
import { kind, median, routes } from '../measure-load.mjs';

test('entryPoints — every export that resolves to JavaScript, and nothing else', () => {
    const found = entryPoints({
        exports: {
            './package.json': { default: './package.json' },
            '.': { types: './types/a.d.ts', default: './fesm2022/a.mjs' },
            './button': { types: './types/b.d.ts', default: './fesm2022/b.mjs' },
            './typed-only': { types: './types/c.d.ts' },
            './plain': './fesm2022/d.mjs'
        }
    });
    assert.deepEqual(
        found.map((e) => e.name),
        ['(root)', 'button', 'plain']
    );
    assert.equal(found[1].file, './fesm2022/b.mjs');
});

test('entryPoints — a manifest without exports yields nothing rather than throwing', () => {
    assert.deepEqual(entryPoints({}), []);
});

test('family — icons and types are told apart from components', () => {
    assert.equal(family('icons'), 'icons');
    assert.equal(family('icons/check'), 'icons');
    assert.equal(family('types/button'), 'types');
    assert.equal(family('iconfield'), 'components');
    assert.equal(family('button'), 'components');
});

test('owner — the entry point\'s own file is "own", other entry points are "library"', () => {
    const own = './fesm2022/anguless-angulux-button.mjs';
    assert.equal(owner('packages/angulux/dist/fesm2022/anguless-angulux-button.mjs', own), 'own');
    assert.equal(owner('packages/angulux/dist/fesm2022/anguless-angulux-badge.mjs', own), 'library');
    assert.equal(owner('packages/angulux-styles/dist/button/index.mjs', own), 'styles');
    assert.equal(owner('packages/angulux-styled/dist/index.mjs', own), 'styled');
    assert.equal(owner('packages/angulux-utils/dist/dom/index.mjs', own), 'utils');
    assert.equal(owner('packages/angulux-motion/dist/index.mjs', own), 'motion');
    assert.equal(owner('node_modules/tslib/tslib.es6.mjs', own), 'other');
});

test('owner — a longer name that merely ends like the entry point is not mistaken for it', () => {
    // `button` must not claim `splitbutton`, nor `select` claim `multiselect`.
    assert.equal(owner('packages/angulux/dist/fesm2022/anguless-angulux-splitbutton.mjs', './fesm2022/anguless-angulux-button.mjs'), 'library');
    assert.equal(owner('packages/angulux/dist/fesm2022/anguless-angulux-multiselect.mjs', './fesm2022/anguless-angulux-select.mjs'), 'library');
});

test('attribute — bytes are summed per owner and files that left nothing are skipped', () => {
    const parts = attribute(
        {
            'packages/angulux/dist/fesm2022/anguless-angulux-button.mjs': { bytesInOutput: 100 },
            'packages/angulux/dist/fesm2022/anguless-angulux-badge.mjs': { bytesInOutput: 30 },
            'packages/angulux/dist/fesm2022/anguless-angulux-ripple.mjs': { bytesInOutput: 20 },
            'packages/angulux-styles/dist/button/index.mjs': { bytesInOutput: 7 },
            'packages/angulux-utils/dist/uuid/index.mjs': { bytesInOutput: 0 }
        },
        './fesm2022/anguless-angulux-button.mjs'
    );
    assert.deepEqual(parts, { own: 100, library: 50, styles: 7 });
});

test('sharedInputs — only files present in EVERY bundle, at the smallest size seen', () => {
    const shared = sharedInputs([
        { base: 10, config: 5, button: 40 },
        { base: 9, config: 5, dialog: 60 },
        { base: 10, config: 6 }
    ]);
    assert.deepEqual(shared, { base: 9, config: 5 });
    assert.deepEqual(sharedInputs([]), {});
    assert.deepEqual(sharedInputs([{ a: 1 }, { b: 1 }]), {});
});

test('heaviestInputs — largest first, with how many bundles pull each in', () => {
    const top = heaviestInputs([{ table: 175, button: 20 }, { button: 21, select: 59 }, { select: 59 }], 2);
    assert.deepEqual(top, [
        { path: 'table', bytes: 175, usedBy: 1 },
        { path: 'select', bytes: 59, usedBy: 2 }
    ]);
});

test('compressed — the three sizes of the same bytes, in the order they should fall', () => {
    const size = compressed(Buffer.from('const a = 1;\n'.repeat(400)));
    assert.equal(size.min, 5200);
    assert.ok(size.gzip < size.min / 10, `gzip ${size.gzip}`);
    assert.ok(size.brotli <= size.gzip, `brotli ${size.brotli} vs gzip ${size.gzip}`);
});

test('kind — a request is filed by what it is, and a bare route is a page', () => {
    assert.equal(kind('/table'), 'html');
    assert.equal(kind('/table/index.html'), 'html');
    assert.equal(kind('/chunk-AB12.js'), 'js');
    assert.equal(kind('/styles-9f.css'), 'css');
    assert.equal(kind('/media/primeicons-x.woff2'), 'font');
    assert.equal(kind('/demos/table.json'), 'data');
    assert.equal(kind('/favicon.ico'), 'other');
});

test('median — odd, even, and the empty set is not a number', () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([4, 1, 3, 2]), 2.5);
    assert.ok(Number.isNaN(median([])));
});

test('routes — every directory with an index.html, and only those', () => {
    const site = mkdtempSync(join(tmpdir(), 'measure-load-'));
    try {
        writeFileSync(join(site, 'index.html'), '');
        for (const dir of ['button', 'table', 'media', 'guide/theming']) mkdirSync(join(site, dir), { recursive: true });
        writeFileSync(join(site, 'button/index.html'), '');
        writeFileSync(join(site, 'table/index.html'), '');
        writeFileSync(join(site, 'guide/theming/index.html'), '');
        writeFileSync(join(site, 'media/font.woff2'), '');
        assert.deepEqual(routes(site), ['/', '/button', '/guide/theming', '/table']);
    } finally {
        rmSync(site, { recursive: true, force: true });
    }
});

test('allowance — one per cent, and never less than 512 bytes', () => {
    assert.equal(allowance(0), 512);
    assert.equal(allowance(20_000), 512);
    assert.equal(allowance(51_200), 512);
    assert.equal(allowance(100_000), 1000);
    assert.equal(allowance(766_054), 7661);
});

test('judge — inside the allowance, in either direction, is quiet', () => {
    const verdict = judge({ button: 100_000, fluid: 40_000 }, { button: 101_000, fluid: 39_488 });
    assert.deepEqual(verdict, { grew: [], shrank: [], added: [], removed: [] });
});

test('judge — one byte past the allowance is growth, and it names the entry point', () => {
    const verdict = judge({ button: 100_000 }, { button: 101_001 });
    assert.deepEqual(verdict.grew, [{ name: 'button', baseline: 100_000, found: 101_001, slack: 1000 }]);
    assert.deepEqual(verdict.shrank, []);
});

test('judge — a shrink past the allowance makes the baseline stale', () => {
    const verdict = judge({ table: 766_054 }, { table: 600_000 });
    assert.deepEqual(verdict.grew, []);
    assert.deepEqual(verdict.shrank, [{ name: 'table', baseline: 766_054, found: 600_000, slack: 7661 }]);
});

test('judge — an entry point missing on either side is reported, never ignored', () => {
    const verdict = judge({ button: 100_000, retired: 5000 }, { button: 100_000, brandnew: 7000 });
    assert.deepEqual(verdict.added, [{ name: 'brandnew', found: 7000 }]);
    assert.deepEqual(verdict.removed, [{ name: 'retired', baseline: 5000 }]);
});

test('pruneBaseline — lowers, adds what is new, drops what is gone, and never raises', () => {
    const next = pruneBaseline({ table: 766_054, button: 100_000, retired: 5000 }, { table: 600_000, button: 130_000, brandnew: 7000 });
    assert.deepEqual(next, { brandnew: 7000, button: 100_000, table: 600_000 });
    // The entry point that grew is still over after the prune: that is the point.
    assert.equal(judge(next, { table: 600_000, button: 130_000, brandnew: 7000 }).grew.length, 1);
});

test('pruneBaseline — keys come out sorted, so the file diffs line by line', () => {
    assert.deepEqual(Object.keys(pruneBaseline({}, { table: 1, api: 2, 'icons/check': 3 })), ['api', 'icons/check', 'table']);
});
