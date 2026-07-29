/**
 * harness — the pure parts of the benchmark: tool conversion, prompting, grading.
 *
 * Kept separate from run.mjs so everything except the API call itself is unit-testable
 * without spending a cent. The only thing run.mjs adds is the network.
 *
 * TWO DELIBERATE DEPARTURES FROM THE SDK'S DEFAULTS, both to protect the measurement:
 *
 *   1. NO `fallbacks`. The guidance is to enable server-side refusal fallbacks by default on
 *      Claude Opus 5, and for production code that is right. Here it would silently answer
 *      some questions on a DIFFERENT model, which is precisely the variable under test. A
 *      refusal is recorded as a refusal instead.
 *
 *   2. NO `temperature`. Not a choice — Opus 5 removed the sampling parameters and rejects
 *      them with a 400. There is therefore no determinism knob, which is exactly why the
 *      plan runs this on demand and never as a blocking gate.
 *
 * The final answer is extracted in a SEPARATE call with no tools and a structured output
 * schema. Constraining the format on the same turn the model is calling tools mixes two
 * concerns; doing it in its own turn makes grading a field comparison rather than a regex
 * over prose, and sidesteps any interaction between tool use and output constraints.
 */

export const ANSWER_SCHEMA = {
    type: 'object',
    properties: {
        answer: {
            type: 'string',
            description: 'The answer alone: a selector, an import specifier, or exactly "yes" or "no".'
        }
    },
    required: ['answer'],
    additionalProperties: false
};

export const SYSTEM = [
    'You are answering questions about angulux, an Angular 22 UI component library.',
    'Answer only from what you can verify. If tools are available, use them before answering.',
    'Do not guess from other component libraries.'
].join(' ');

/** MCP tool definitions -> Anthropic tool definitions. Same schema, different field names. */
export function toAnthropicTools(mcpTools) {
    return mcpTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
    }));
}

/**
 * Grade one answer.
 *
 * Deliberately forgiving about shape and strict about content: a model may answer
 * "`agl-button`" or "The selector is agl-button". It may not answer "p-button".
 */
export function grade(question, rawAnswer) {
    if (typeof rawAnswer !== 'string') return { correct: false, reason: 'no answer' };

    const answer = rawAnswer.trim().toLowerCase().replace(/[`'".]/g, '');
    const expected = String(question.expect).toLowerCase();
    const wrong = String(question.primeNgWrongAnswer).toLowerCase();

    if (expected === 'yes' || expected === 'no') {
        // Yes/no must be decided by the leading token, or "no, it is not supported" and
        // "not no — it is supported" would grade the same.
        const first = answer.split(/[^a-z]+/).filter(Boolean)[0];
        return { correct: first === expected, gaveWrongAnswer: first === wrong, normalised: first ?? '' };
    }

    // For selectors and import specifiers, containment: the answer may be a sentence.
    return {
        correct: answer.includes(expected),
        gaveWrongAnswer: !answer.includes(expected) && answer.includes(wrong),
        normalised: answer
    };
}

/**
 * One question per kind, in file order — a cheap probe that still spans the whole set.
 *
 * `--limit 5` looks like the obvious way to try a few questions and is a trap: the set is
 * grouped by kind, so the first five are all selector questions. That would measure one
 * question type and read as if it measured the benchmark.
 */
export function sampleOnePerKind(questions) {
    const seen = new Set();
    return questions.filter((q) => !seen.has(q.kind) && seen.add(q.kind));
}

export function summarise(results) {
    const correct = results.filter((r) => r.correct).length;
    const primeNg = results.filter((r) => r.gaveWrongAnswer).length;
    const refused = results.filter((r) => r.refused).length;
    // Errored questions are reported separately from wrong ones. A run that half-failed on
    // billing must not read as a model that got half the answers wrong.
    const errored = results.filter((r) => r.error).length;
    return { asked: results.length, correct, gavePrimeNgAnswer: primeNg, refused, errored };
}
