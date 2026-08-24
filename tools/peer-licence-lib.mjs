/**
 * The pure half of check-peer-licence: comparing versions, and proving where a range stops.
 *
 * Kept apart so it can be tested directly. The whole gate rests on one question — "can this
 * range reach the commercial boundary?" — and a wrong answer here is not a broken build, it
 * is a green build over a manifest that points a stranger's package manager at software
 * they have no licence for.
 *
 * No fs, no process, no exit.
 */

const release = (v) => v.split('-')[0].split('.').map(Number);

/** -1, 0, 1. Release numbers only: a prerelease sorts with the release it belongs to. */
export function compareVersions(a, b) {
    const [x, y] = [release(a), release(b)];

    for (let i = 0; i < 3; i++) {
        if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0) ? -1 : 1;
    }

    return 0;
}

/**
 * The EXCLUSIVE upper bound of a range, or `null` when this cannot prove one.
 *
 * Only exact versions, `^` and `~` are provable here. `||`, `>=`, `*` and `x` return null
 * and the caller must treat that as a failure — approximating them would turn the one
 * question this gate asks into a guess, and a guess that resolves to "probably fine" is
 * worth nothing on a licence boundary.
 *
 * npm's caret rules for a leading zero are load-bearing, not a footnote: `^0.8.0` stops at
 * `0.9.0`, and `@primeuix/utils` has its boundary at exactly `0.8.0`.
 */
export function upperBound(range) {
    if (typeof range !== 'string') return null;

    const exact = /^(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/.exec(range.trim());

    if (exact) return `${Number(exact[1])}.${Number(exact[2])}.${Number(exact[3]) + 1}`;

    const ranged = /^([\^~])(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/.exec(range.trim());

    if (!ranged) return null;

    const [operator, major, minor, patch] = [ranged[1], Number(ranged[2]), Number(ranged[3]), Number(ranged[4])];

    if (operator === '~') return `${major}.${minor + 1}.0`;
    if (major > 0) return `${major + 1}.0.0`;
    if (minor > 0) return `0.${minor + 1}.0`;

    return `0.0.${patch + 1}`;
}

/**
 * Is every version this range admits strictly below `boundary`?
 *
 * `<=` rather than `<` because the bound is EXCLUSIVE: a range that stops at exactly the
 * boundary stops just short of it, which is the whole point of `^2.0.0` against `3.0.0`.
 */
export function staysBelow(range, boundary) {
    const upper = upperBound(range);

    return upper === null ? null : compareVersions(upper, boundary) <= 0;
}
