/**
 * tools — the five questions this server can answer, over the loaded corpus.
 *
 * The set is deliberately small and derived from our own data model: the corpus contains
 * MODULES and DECLARATIONS, so the tools are about modules and declarations. There are no
 * "guides" or "examples" to expose because the corpus has none, and inventing tools for data
 * we do not have would produce confident empty answers.
 *
 * `check_usage` is the one that justifies the whole feature. Angulux is a 2026 fork with no
 * presence in any model's training data, so an assistant's prior for "how do I render a
 * button" is `<p-button>` — PrimeNG's. This tool turns that guess into a checkable claim and
 * hands back the real selector.
 *
 * Every description below is written for a model deciding whether to call the tool, not for a
 * human reading a manual: prescriptive about WHEN, because a description that only says what
 * a tool does measurably under-triggers.
 */

const SCOPE = '@anguless/angulux/';

/** PrimeNG's element prefix and its attribute-selector form, which is what a model guesses. */
const PRIME_ELEMENT = /^p-(.+)$/;
const PRIME_ATTRIBUTE = /^\[p([A-Z].*)\]$/;

/**
 * The routes that USED to fill a template slot, and exist nowhere now.
 *
 * BL-35 collapsed three mechanisms into one across 31 modules: `pTemplate="x"`/`aglTemplate="x"`
 * resolved through a directive switch, `<p-header>`/`<p-footer>` projected through
 * `<ng-content select>`, and `<ng-template #x>` read by a decorator query. Only the last
 * survives, as `contentChild('x')`.
 *
 * This one deserves its own answer rather than the generic "does not exist", because it fails
 * SILENTLY. `aglTemplate="header"` is a plain static attribute: with no directive to match it
 * Angular says nothing, the build stays green, and the slot renders empty — which is how 27 of
 * these sat broken inside this repository across three commits before a gate went looking. A
 * model that gets told the selector is unknown still has no idea what to write instead, and
 * the thing it will reach for next is the facet component, which is also gone.
 */
const RETIRED_TEMPLATE_DIRECTIVE = /^\[?(?:p|agl)Template\]?$/;
const RETIRED_FACET = /^<?(?:p|agl)-(header|footer)>?$/;

/** How many slot names to print before naming the cost of the rest. */
const SLOT_PREVIEW = 12;

const membersOf = (module) =>
    module.declarations.flatMap((declaration) => [
        ...declaration.inputs.map((input) => ({ declaration, member: input, kind: 'input' })),
        ...declaration.outputs.map((output) => ({ declaration, member: output, kind: 'output' }))
    ]);

const summarise = (module) => ({
    name: module.name,
    entrypoint: module.entrypoint,
    declarationCount: module.declarations.length
});

const slotsOf = (module) => module.declarations.flatMap((declaration) => declaration.slots.map((slot) => ({ declaration, slot })));

/**
 * The module's slot names, as a sentence that ends an answer instead of starting a search.
 *
 * Capped, and the cap is SAID. `table` declares 32 slots on one declaration; printing them all
 * inside a problem string costs more than the get_module call it is trying to save. Printing
 * twelve and stopping quietly would be worse than either — a caller cannot tell a short list
 * from a trimmed one, which is the same rule the get_module views follow.
 */
function slotSentence(module) {
    const names = [...new Set(slotsOf(module).map(({ slot }) => slot.name))];
    if (!names.length) return `\`${module.name}\` declares no template slots.`;

    const shown = names.slice(0, SLOT_PREVIEW);
    const rest = names.length - shown.length;
    const tail = rest > 0 ? `, and ${rest} more — get_module for the rest` : '';
    return `\`${module.name}\` slots: ${shown.map((name) => `#${name}`).join(', ')}${tail}.`;
}

/**
 * If this token is one of the retired routes, the answer that names the replacement.
 *
 * Returns null for anything else, so the caller falls through to the generic selector path.
 */
function retiredSlotRoute(token, module) {
    const facet = RETIRED_FACET.exec(token);
    if (facet) {
        return (
            `\`${token}\` is the retired facet component; angulux fills that slot with ` +
            `\`<ng-template #${facet[1]}>\` inside the component's own tags`
        );
    }
    if (RETIRED_TEMPLATE_DIRECTIVE.test(token)) {
        return (
            `\`${token}\` is the retired template directive; angulux has exactly one route per ` +
            'slot — `<ng-template #NAME>`, read by `contentChild(\'NAME\')`. An unmatched ' +
            '`pTemplate=`/`aglTemplate=` throws nothing and renders nothing. ' +
            (module ? slotSentence(module) : 'Pass `module` to get that module\'s slot names.')
        );
    }
    return null;
}

export function createTools(corpus) {
    const allSelectors = new Map();
    for (const module of corpus.modules) {
        for (const declaration of module.declarations) {
            if (declaration.selector) allSelectors.set(declaration.selector, { module, declaration });
        }
    }

    /** Given a PrimeNG-shaped selector, the angulux one — if the library actually has it. */
    const anguluxEquivalent = (selector) => {
        const element = PRIME_ELEMENT.exec(selector);
        if (element) {
            const candidate = `agl-${element[1]}`;
            return allSelectors.has(candidate) ? candidate : null;
        }
        const attribute = PRIME_ATTRIBUTE.exec(selector);
        if (attribute) {
            const candidate = `[agl${attribute[1]}]`;
            return allSelectors.has(candidate) ? candidate : null;
        }
        return null;
    };

    return {
        list_modules: {
            description:
                'List every angulux module that is supported, with the import specifier for each. ' +
                'Call this first when you do not know which module a component lives in, to check ' +
                'whether something is supported at all before recommending it, or whenever the ' +
                'question is only "what do I import" — this returns all 64 modules for a fraction of ' +
                'what fetching one large module costs.',
            inputSchema: {
                type: 'object',
                properties: {
                    withApiOnly: {
                        type: 'boolean',
                        description: 'Omit modules that declare no component or directive (internal infrastructure).'
                    }
                }
            },
            handler: ({ withApiOnly = false } = {}) => ({
                modules: corpus.modules
                    .filter((module) => !withApiOnly || module.declarations.length > 0)
                    .map(summarise)
            })
        },

        get_module: {
            description:
                "Get a module's API: the components and directives it declares, with each input and " +
                'output, its type, whether a default is documented, whether it is deprecated, and ' +
                'the template slots it projects — the `x` in `<ng-template #x>`, which is the only ' +
                'way angulux fills a slot. Call this before writing angulux markup. Large modules ' +
                'are expensive — `table` declares 25 things — so for an unfamiliar module pass ' +
                '`summary: true` first: it names every slot while omitting the member arrays. Then ' +
                'pass `declaration` to fetch just the one you need. If you only want the import ' +
                'specifier, use list_modules instead; it returns all 64 for less than one large ' +
                'module costs.',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Module name, e.g. "button".' },
                    summary: {
                        type: 'boolean',
                        description: 'Return declaration names, kinds, selectors and member COUNTS only.'
                    },
                    declaration: {
                        type: 'string',
                        description: 'Return only this declaration, e.g. "Table", in full detail.'
                    }
                },
                required: ['name']
            },
            handler: ({ name, summary = false, declaration } = {}) => {
                const module = corpus.moduleByName(name);
                if (!module) {
                    return {
                        found: false,
                        reason:
                            `"${name}" is not in the warranted closure of ${corpus.closureCount} supported ` +
                            'modules. It may exist upstream in PrimeNG, or be an angulux module held back ' +
                            'from this release — either way it is not supported and should not be recommended.'
                    };
                }

                if (declaration !== undefined) {
                    const one = module.declarations.find((d) => d.name === declaration);
                    if (!one) {
                        return {
                            found: false,
                            reason:
                                `\`${name}\` declares no \`${declaration}\`. It declares: ` +
                                `${module.declarations.map((d) => d.name).join(', ') || '(nothing)'}.`
                        };
                    }
                    return { found: true, view: 'declaration', module: { ...module, declarations: [one] } };
                }

                if (summary) {
                    return {
                        found: true,
                        view: 'summary',
                        module: {
                            ...module,
                            declarations: module.declarations.map(
                                ({ name: n, kind, selector, description, inputs, outputs, slots }) => ({
                                    name: n,
                                    kind,
                                    selector,
                                    description,
                                    inputCount: inputs.length,
                                    outputCount: outputs.length,
                                    // Names, not a count. A slot name is short, there are at most
                                    // 32 on any declaration, and it is the one thing a caller
                                    // cannot guess from anything else in this view — a count
                                    // would tell them a slot exists and still leave them writing
                                    // `#loadingIcon` for `#loadingicon`.
                                    slots: slots.map((slot) => slot.name)
                                })
                            )
                        }
                    };
                }

                return { found: true, view: 'full', module };
            }
        },

        search_api: {
            description:
                'Search every input, output and template slot across all supported modules by name. ' +
                'Call this when you know the property or slot a user is asking about but not which ' +
                'component declares it.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Substring to match against input/output names.' },
                    limit: { type: 'integer', description: 'Maximum matches to return. Defaults to 25.' }
                },
                required: ['query']
            },
            handler: ({ query, limit = 25 } = {}) => {
                const needle = String(query ?? '').toLowerCase();
                const matches = [];

                // Corpus order is already deterministic (modules sorted, members in source
                // order), so a stable walk plus a hard cap gives a reproducible answer that
                // cannot blow the caller's context.
                for (const module of corpus.modules) {
                    for (const { declaration, member, kind } of membersOf(module)) {
                        if (!member.name.toLowerCase().includes(needle)) continue;
                        matches.push({
                            module: module.name,
                            declaration: declaration.name,
                            member: member.name,
                            kind
                        });
                        if (matches.length >= limit) return { matches };
                    }
                    // Slots are searched under the name a caller WRITES. Searching the field
                    // name instead would answer "header" with `headerTemplate` — a member of the
                    // class, not a thing anyone can type into markup.
                    for (const { declaration, slot } of slotsOf(module)) {
                        if (!slot.name.toLowerCase().includes(needle)) continue;
                        matches.push({
                            module: module.name,
                            declaration: declaration.name,
                            member: `#${slot.name}`,
                            kind: 'slot'
                        });
                        if (matches.length >= limit) return { matches };
                    }
                }
                return { matches };
            }
        },

        check_usage: {
            description:
                'Check angulux usage before you write it: a selector, an import specifier, a module ' +
                'name, a list of input names, or the template slots you are about to fill. Call this ' +
                'whenever you are about to recommend angulux code you did not read out of this corpus ' +
                '— it catches PrimeNG selectors, unscoped imports, deprecated inputs, inputs that do ' +
                'not exist, the retired `pTemplate=`/`<p-header>` template routes, and slot names ' +
                'whose casing is wrong. Pass `module` with `inputs` or `slots`; without it there is ' +
                'nothing to check them against.',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'e.g. "agl-button" or "[aglButton]".' },
                    entrypoint: { type: 'string', description: 'e.g. "@anguless/angulux/button".' },
                    module: { type: 'string', description: 'Module name the inputs and slots belong to.' },
                    inputs: { type: 'array', items: { type: 'string' }, description: 'Input names to verify.' },
                    slots: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Template slot names to verify — the `x` in `<ng-template #x>`.'
                    }
                }
            },
            handler: ({ selector, entrypoint, module: moduleName, inputs, slots } = {}) => {
                const problems = [];
                // Resolved before the selector check so a retired-route answer can name this
                // module's real slots. The `module` verdict itself is still pushed in its own
                // place below, so the order a caller reads problems in does not change.
                const module = moduleName === undefined ? undefined : corpus.moduleByName(moduleName);

                if (selector !== undefined) {
                    if (!allSelectors.has(selector)) {
                        const retired = retiredSlotRoute(selector, module);
                        const equivalent = anguluxEquivalent(selector);
                        problems.push(
                            retired ??
                                (equivalent
                                    ? `selector \`${selector}\` is PrimeNG's; angulux uses \`${equivalent}\``
                                    : `selector \`${selector}\` does not exist in angulux`)
                        );
                    }
                }

                if (entrypoint !== undefined && !entrypoint.startsWith(SCOPE)) {
                    const bare = entrypoint.replace(/^(?:angulux|primeng)\//, '');
                    problems.push(
                        `import specifier \`${entrypoint}\` does not resolve; angulux is scoped — use ` +
                            `\`${SCOPE}${bare}\``
                    );
                }

                if (moduleName !== undefined && !module) {
                    problems.push(`module \`${moduleName}\` is not in the supported closure`);
                }

                // Names to verify, with nothing to verify them against. Returning `ok: true`
                // here would be the one answer this tool must never give: the caller asked a
                // question, got a clean verdict, and nothing was checked.
                for (const [key, value] of [
                    ['inputs', inputs],
                    ['slots', slots]
                ]) {
                    if (Array.isArray(value) && value.length && moduleName === undefined) {
                        problems.push(`\`${key}\` cannot be checked without \`module\` — nothing was verified`);
                    }
                }

                if (Array.isArray(inputs) && module) {
                    // Every declaration that carries this input, not just one. A module can
                    // declare the same input name on two declarations with DIFFERENT
                    // deprecation status — `button` has `label` on both Button (current) and
                    // ButtonDirective (deprecated). Collapsing them into one lookup discards
                    // exactly the distinction the corpus is keyed by declaration to preserve,
                    // and whichever one happened to be last would silently decide the verdict.
                    const declaredBy = new Map();
                    for (const { declaration, member, kind } of membersOf(module)) {
                        if (kind !== 'input') continue;
                        if (!declaredBy.has(member.name)) declaredBy.set(member.name, []);
                        declaredBy.get(member.name).push({ declaration, input: member });
                    }

                    for (const name of inputs) {
                        const sites = declaredBy.get(name);
                        if (!sites) {
                            // `pTemplate` arrives here as often as it arrives as a selector,
                            // because a model that thinks of it as an attribute passes it as
                            // one. Same wrong answer, so the same right one.
                            problems.push(
                                retiredSlotRoute(name, module) ??
                                    `\`${name}\` is not an input of any declaration in \`${module.name}\``
                            );
                            continue;
                        }
                        for (const { declaration, input } of sites.filter((site) => site.input.deprecated)) {
                            const ambiguity =
                                sites.length > 1
                                    ? ` (\`${module.name}\` declares \`${name}\` on ${sites
                                          .map((site) => site.declaration.name)
                                          .join(' and ')} — only this one is deprecated)`
                                    : '';
                            problems.push(
                                `input \`${name}\` on \`${declaration.name}\` is deprecated: ` +
                                    `${input.deprecated}${ambiguity}`
                            );
                        }
                    }
                }

                if (Array.isArray(slots) && module) {
                    const declaredSlots = new Map();
                    for (const { declaration, slot } of slotsOf(module)) {
                        if (!declaredSlots.has(slot.name)) declaredSlots.set(slot.name, []);
                        declaredSlots.get(slot.name).push({ declaration, slot });
                    }

                    for (const name of slots) {
                        const sites = declaredSlots.get(name);
                        if (!sites) {
                            // Casing first, because it is the failure that looks like success.
                            // `loadingIconTemplate` fills `#loadingicon`; anyone deriving the
                            // slot from the field writes `#loadingIcon`, Angular matches
                            // reference names exactly, and the miss is silent — no error, no
                            // warning, just an empty slot. Answering "no such slot" to that
                            // would be true and would send the caller looking in the wrong place.
                            const misCased = [...declaredSlots.keys()].find(
                                (candidate) => candidate.toLowerCase() === String(name).toLowerCase()
                            );
                            problems.push(
                                misCased
                                    ? `\`<ng-template #${name}>\` never binds — \`${module.name}\` spells that slot ` +
                                          `\`#${misCased}\`, and a reference name that does not match exactly fails silently`
                                    : `\`${module.name}\` has no \`#${name}\` slot. ${slotSentence(module)}`
                            );
                            continue;
                        }
                        for (const { declaration, slot } of sites.filter((site) => site.slot.deprecated)) {
                            problems.push(
                                `slot \`#${name}\` on \`${declaration.name}\` is deprecated: ${slot.deprecated}`
                            );
                        }
                    }
                }

                return { ok: problems.length === 0, problems };
            }
        },

        corpus_info: {
            description:
                'Report which angulux version and which corpus this server is answering from. Call ' +
                'this when an answer looks inconsistent with the code in front of you — a mismatch ' +
                'between the corpus hash here and the repository means the server is stale. Compare ' +
                'the HASH, not the version: `libraryVersion` is the checkout\'s, and it trails npm ' +
                'by design.',
            inputSchema: { type: 'object', properties: {} },
            handler: () => ({
                libraryVersion: corpus.libraryVersion,
                // Said out loud, because the number invites a comparison that means nothing.
                // Releases stamp the version in CI and no longer commit it back — the
                // semantic-release git plugin was removed on 2026-08-01 when it could not push
                // to a protected branch — so a checkout reports the last COMMITTED version while
                // npm serves a later one. That gap is not staleness and the API behind it is
                // identical; reading it as staleness would send someone regenerating a corpus
                // that is already correct. `sourceHash` is the signal that cannot lie: it
                // digests the exact files that fed this corpus.
                libraryVersionNote:
                    'the version committed in this checkout, not the published one — a release ' +
                    'stamps the version in CI without committing it back, so this trails npm by ' +
                    'design. Use sourceHash to detect a stale corpus.',
                sourceHash: corpus.sourceHash,
                closureCount: corpus.closureCount,
                generatedFormatVersion: corpus.formatVersion
            })
        }
    };
}
