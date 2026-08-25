import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { RAILS } from '../../release/rails.mjs';
import { analysePlugins, pluginName, pluginOptions, railFromFilename, RAIL_FILTER } from '../release-plugins-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RAIL_NAMES = Object.keys(RAILS);

/** A config that is correct, so every test below can break exactly one thing about it. */
const wellFormed = () => ({
    plugins: [
        [RAIL_FILTER, { rail: 'angulux', preset: 'conventionalcommits' }],
        ['@semantic-release/npm', { npmPublish: false }],
        ['@semantic-release/github', {}]
    ]
});

const rules = (config, rail = 'angulux') => analysePlugins(config, rail, RAIL_NAMES).map((p) => p.rule);

describe('release plugin entry shapes', () => {
    it('reads both the bare and the [name, options] forms', () => {
        strictEqual(pluginName('@semantic-release/npm'), '@semantic-release/npm');
        strictEqual(pluginName(['@semantic-release/npm', { a: 1 }]), '@semantic-release/npm');
        deepStrictEqual(pluginOptions(['x', { a: 1 }]), { a: 1 });
        deepStrictEqual(pluginOptions('x'), {});
        deepStrictEqual(pluginOptions(['x']), {});
    });

    it('derives the rail from the filename, on either separator', () => {
        strictEqual(railFromFilename('release/angulux.releaserc.json'), 'angulux');
        strictEqual(railFromFilename('release\\forks.releaserc.json'), 'forks');
        strictEqual(railFromFilename('forks.releaserc.json'), 'forks');
    });
});

describe('analysePlugins accepts a well-formed train', () => {
    it('reports nothing', () => {
        deepStrictEqual(analysePlugins(wellFormed(), 'angulux', RAIL_NAMES), []);
    });
});

describe('analysePlugins rejects — one mutation each', () => {
    it('1. the duplicate that shipped: the filter listed twice', () => {
        const config = wellFormed();

        // Exactly the shape #134 left behind: two entries, different options, same path.
        config.plugins.splice(1, 0, [RAIL_FILTER, { rail: 'angulux', presetConfig: { types: [] } }]);

        const found = analysePlugins(config, 'angulux', RAIL_NAMES);

        deepStrictEqual(found.map((p) => p.rule), ['duplicate']);
        ok(found[0].message.includes('2 times'), 'says how many times, so the reader can find them');
        ok(/generateNotes/.test(found[0].message), 'names the mechanism, not just the fact');
    });

    it('2. a duplicate of any other plugin is caught too, not just the filter', () => {
        const config = wellFormed();

        config.plugins.push(['@semantic-release/github', {}]);

        deepStrictEqual(rules(config), ['duplicate']);
    });

    it('3. three copies are reported once, with the count', () => {
        const config = wellFormed();

        config.plugins.push([RAIL_FILTER, { rail: 'angulux' }], [RAIL_FILTER, { rail: 'angulux' }]);

        const found = analysePlugins(config, 'angulux', RAIL_NAMES);

        strictEqual(found.filter((p) => p.rule === 'duplicate').length, 1);
        ok(found[0].message.includes('3 times'));
    });

    it('4. the rail filter dropped entirely — BL-60 regressing in silence', () => {
        const config = wellFormed();

        config.plugins.shift();

        deepStrictEqual(rules(config), ['missing-filter']);
    });

    it('5. the wrong rail for this file — the copy-paste with teeth', () => {
        deepStrictEqual(rules(wellFormed(), 'forks'), ['rail']);
    });

    it('6. a rail that release/rails.mjs does not define', () => {
        const config = wellFormed();

        config.plugins[0][1].rail = 'not-a-train';

        const found = analysePlugins(config, 'angulux', RAIL_NAMES);

        deepStrictEqual(found.map((p) => p.rule), ['rail']);
        ok(RAIL_NAMES.every((name) => found[0].message.includes(name)), 'lists the real rails, so the fix is obvious');
    });

    it('7. no rail option at all', () => {
        const config = wellFormed();

        config.plugins[0] = [RAIL_FILTER, { preset: 'conventionalcommits' }];

        deepStrictEqual(rules(config), ['rail']);
    });

    it('8. the filter written bare, with no options object', () => {
        const config = wellFormed();

        config.plugins[0] = RAIL_FILTER;

        deepStrictEqual(rules(config), ['rail']);
    });

    it('9. no plugins array — semantic-release would run its defaults and filter nothing', () => {
        deepStrictEqual(rules({}), ['shape']);
        deepStrictEqual(rules({ plugins: 'nope' }), ['shape']);
    });
});

describe('the real configs in release/', () => {
    const files = readdirSync(join(ROOT, 'release')).filter((f) => f.endsWith('.releaserc.json'));

    it('there is one per rail, named after it', () => {
        deepStrictEqual(files.map(railFromFilename).sort(), [...RAIL_NAMES].sort());
    });

    for (const file of files) {
        it(`${file} is well-formed`, () => {
            const config = JSON.parse(readFileSync(join(ROOT, 'release', file), 'utf8'));

            deepStrictEqual(analysePlugins(config, railFromFilename(file), RAIL_NAMES), []);
        });

        // The regression that motivated the gate, asserted against the file itself rather than
        // only against a fixture: this is the state that published a doubled changelog.
        it(`${file} lists the rail filter exactly once`, () => {
            const config = JSON.parse(readFileSync(join(ROOT, 'release', file), 'utf8'));

            strictEqual(config.plugins.map(pluginName).filter((name) => name === RAIL_FILTER).length, 1);
        });
    }
});
