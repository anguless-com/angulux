/**
 * lint-baseline — the arithmetic behind the frozen findings of `check:lint`.
 *
 * Pure: no filesystem, no ESLint. A baseline and a set of findings are both
 * `{ <file>: { <rule key>: <count> } }`; everything here compares or shrinks those.
 *
 * WHY COUNTS and not line numbers: a line number moves when anyone edits the file above it,
 * and a baseline that breaks on unrelated edits gets regenerated, which is how a baseline
 * stops meaning anything. A count per file and rule survives every edit that does not add a
 * finding. The cost is that one finding can be traded for another of the same rule in the
 * same file; that is the trade ESLint's own bulk suppressions make.
 */

/**
 * One key per distinguishable rule. `no-restricted-syntax` is many rules behind one id, so
 * its messages carry a label before the first colon ("Focused test: …") and the key keeps it.
 */
export function ruleKey(message) {
    // With `noInlineConfig` on, ESLint answers an `eslint-disable` comment with a rule-less
    // warning that the comment has no effect. That warning is the count of such comments.
    if (!message.ruleId && /noInlineConfig/.test(String(message.message))) return 'inert-eslint-comment';
    const id = message.ruleId ?? 'unknown';
    if (id !== 'no-restricted-syntax') return id;
    const label = String(message.message).split(':')[0].trim().toLowerCase().replace(/\s+/g, '-');
    return `no-restricted-syntax/${label}`;
}

/** `[{ file, messages }]` → `{ file: { rule: count } }`, files without findings left out. */
export function countFindings(results) {
    const out = {};
    for (const { file, messages } of results) {
        for (const m of messages) {
            const key = ruleKey(m);
            (out[file] ??= {})[key] = (out[file][key] ?? 0) + 1;
        }
    }
    return out;
}

/**
 * Where the code is over its allowance, and where the allowance is over the code.
 *
 * @returns {{over: object[], under: object[]}} each entry `{ file, rule, found, allowed }`
 */
export function compare(baseline, found) {
    const over = [];
    const under = [];

    for (const [file, rules] of Object.entries(found)) {
        for (const [rule, n] of Object.entries(rules)) {
            const allowed = baseline[file]?.[rule] ?? 0;
            if (n > allowed) over.push({ file, rule, found: n, allowed });
        }
    }
    for (const [file, rules] of Object.entries(baseline)) {
        for (const [rule, allowed] of Object.entries(rules)) {
            const n = found[file]?.[rule] ?? 0;
            if (n < allowed) under.push({ file, rule, found: n, allowed });
        }
    }

    const order = (a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule);
    return { over: over.sort(order), under: under.sort(order) };
}

/**
 * The baseline after giving back every allowance the code no longer needs.
 *
 * It takes the smaller of the two numbers, so it can lower an entry or remove it and can
 * never raise one or add one: a finding that is over its allowance stays over.
 */
export function prune(baseline, found) {
    const out = {};
    for (const file of Object.keys(baseline).sort()) {
        for (const rule of Object.keys(baseline[file]).sort()) {
            const n = Math.min(baseline[file][rule], found[file]?.[rule] ?? 0);
            if (n > 0) (out[file] ??= {})[rule] = n;
        }
    }
    return out;
}
