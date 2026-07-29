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
                'output, its type, whether a default is documented, and whether it is deprecated. ' +
                'Call this before writing angulux markup. Large modules are expensive — `table` ' +
                'declares 25 things — so for an unfamiliar module pass `summary: true` first to see ' +
                'what it declares, then pass `declaration` to fetch just the one you need. If you ' +
                'only want the import specifier, use list_modules instead; it returns all 64 for ' +
                'less than one large module costs.',
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
                            declarations: module.declarations.map(({ name: n, kind, selector, description, inputs, outputs }) => ({
                                name: n,
                                kind,
                                selector,
                                description,
                                inputCount: inputs.length,
                                outputCount: outputs.length
                            }))
                        }
                    };
                }

                return { found: true, view: 'full', module };
            }
        },

        search_api: {
            description:
                'Search every input and output across all supported modules by name. Call this when ' +
                'you know the property a user is asking about but not which component declares it.',
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
                }
                return { matches };
            }
        },

        check_usage: {
            description:
                'Check angulux usage before you write it: a selector, an import specifier, a module ' +
                'name, or a list of input names. Call this whenever you are about to recommend ' +
                'angulux code you did not read out of this corpus — it catches PrimeNG selectors, ' +
                'unscoped imports, deprecated inputs, and inputs that do not exist.',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'e.g. "agl-button" or "[aglButton]".' },
                    entrypoint: { type: 'string', description: 'e.g. "@anguless/angulux/button".' },
                    module: { type: 'string', description: 'Module name the inputs belong to.' },
                    inputs: { type: 'array', items: { type: 'string' }, description: 'Input names to verify.' }
                }
            },
            handler: ({ selector, entrypoint, module: moduleName, inputs } = {}) => {
                const problems = [];

                if (selector !== undefined) {
                    if (!allSelectors.has(selector)) {
                        const equivalent = anguluxEquivalent(selector);
                        problems.push(
                            equivalent
                                ? `selector \`${selector}\` is PrimeNG's; angulux uses \`${equivalent}\``
                                : `selector \`${selector}\` does not exist in angulux`
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

                const module = moduleName === undefined ? undefined : corpus.moduleByName(moduleName);
                if (moduleName !== undefined && !module) {
                    problems.push(`module \`${moduleName}\` is not in the supported closure`);
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
                            problems.push(`\`${name}\` is not an input of any declaration in \`${module.name}\``);
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

                return { ok: problems.length === 0, problems };
            }
        },

        corpus_info: {
            description:
                'Report which angulux version and which corpus this server is answering from. Call ' +
                'this when an answer looks inconsistent with the code in front of you — a mismatch ' +
                'between the corpus hash here and the repository means the server is stale.',
            inputSchema: { type: 'object', properties: {} },
            handler: () => ({
                libraryVersion: corpus.libraryVersion,
                sourceHash: corpus.sourceHash,
                closureCount: corpus.closureCount,
                generatedFormatVersion: corpus.formatVersion
            })
        }
    };
}
