/**
 * The pure half of `check:release-plugins`: what a well-formed semantic-release plugin list
 * looks like for a train.
 *
 * Separate from the CLI so the gate can be tested against hand-built configs rather than only
 * against the two real ones — a gate whose only fixture is the state it is meant to reject
 * cannot be shown to reject anything.
 *
 * Everything here is a pure function of parsed JSON. No reads, no process, no exit.
 */

/** A plugin entry is either `"name"` or `["name", options]`. */
export const pluginName = (entry) => (Array.isArray(entry) ? entry[0] : entry);

export const pluginOptions = (entry) => (Array.isArray(entry) ? (entry[1] ?? {}) : {});

/** The wrapper that makes each train count only its own commits. */
export const RAIL_FILTER = './release/rail-filter.mjs';

/**
 * Problems with one train's config, as `[{ rule, message }]`. Empty means well-formed.
 *
 * @param config    the parsed `.releaserc.json`
 * @param expectedRail  the train this file is for, derived from its filename
 * @param knownRails    every rail `release/rails.mjs` defines
 */
export function analysePlugins(config, expectedRail, knownRails) {
    const problems = [];
    const fail = (rule, message) => problems.push({ rule, message });
    const plugins = config?.plugins;

    if (!Array.isArray(plugins)) {
        fail('shape', 'has no `plugins` array — semantic-release would run its defaults, which filter nothing');

        return problems;
    }

    const names = plugins.map(pluginName);

    // 1. DUPLICATES — the one that shipped.
    //
    // semantic-release runs every step against every entry that implements it, and CONCATENATES
    // what `generateNotes` returns. `rail-filter.mjs` exports both `analyzeCommits` and
    // `generateNotes`, so listing it twice publishes every changelog entry twice. Nothing
    // fails: the version is right, the package is right, and only the public notes are wrong.
    // That is precisely the shape of defect a human review does not catch.
    for (const name of [...new Set(names.filter((n, i) => names.indexOf(n) !== i))]) {
        const count = names.filter((n) => n === name).length;

        fail(
            'duplicate',
            `lists "${name}" ${count} times. semantic-release runs each step once PER ENTRY and concatenates generateNotes, so the release notes come out repeated. Merge the options into one entry.`
        );
    }

    // 2. THE FILTER MUST BE THERE.
    //
    // Without it a train falls back to analysing every commit since its own tag, which is the
    // defect BL-60 existed to fix. Losing it would be silent in exactly the same way: a green
    // release with a changelog crediting the train with work that is not in it.
    if (!names.includes(RAIL_FILTER)) {
        fail('missing-filter', `does not use "${RAIL_FILTER}" — the train would count every commit since its tag again, and say so in its release notes`);
    }

    // 3. THE RAIL MUST BE THIS FILE'S RAIL.
    //
    // The two configs are near-copies of each other, and the option that must differ is one
    // word deep inside them. A forks config declaring `rail: "angulux"` would filter fork
    // releases by the library's paths — plausible-looking output, entirely wrong.
    for (const entry of plugins.filter((p) => pluginName(p) === RAIL_FILTER)) {
        const rail = pluginOptions(entry).rail;

        if (rail === undefined) {
            fail('rail', `uses "${RAIL_FILTER}" without a \`rail\` option — it cannot know which paths belong to this train`);
        } else if (!knownRails.includes(rail)) {
            fail('rail', `names rail "${rail}", which release/rails.mjs does not define (known: ${knownRails.join(', ')})`);
        } else if (rail !== expectedRail) {
            fail('rail', `names rail "${rail}" but this file is the "${expectedRail}" train — it would filter by the wrong path list`);
        }
    }

    return problems;
}

/** `release/angulux.releaserc.json` -> `angulux`. The filename IS the declaration. */
export const railFromFilename = (file) => file.replace(/\\/g, '/').split('/').pop().replace(/\.releaserc\.json$/, '');
