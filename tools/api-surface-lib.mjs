/**
 * api-surface-lib — the pure half of `check:api-surface`. No filesystem, no git, no exit, so
 * every decision that turns a build red is testable with two object literals.
 */

/**
 * Flatten a corpus into the surface a consumer's template can depend on.
 *
 * One entry per selector, input, output and slot, keyed by a line a human can read back
 * (`dialog/Dialog input visible`). The value is what must not silently change: the selector
 * text, or the declared type. Slots carry no type; their existence is the contract.
 */
export function surfaceOf(corpus) {
    const surface = new Map();
    for (const m of corpus.modules ?? []) {
        for (const d of m.declarations ?? []) {
            const id = `${m.name}/${d.name}`;
            if (d.selector) surface.set(`${id} selector`, String(d.selector));
            for (const i of d.inputs ?? []) surface.set(`${id} input ${i.name}`, String(i.type ?? ''));
            for (const o of d.outputs ?? []) surface.set(`${id} output ${o.name}`, String(o.type ?? ''));
            for (const s of d.slots ?? []) surface.set(`${id} slot ${s.name}`, '');
        }
    }
    return surface;
}

/** What a consumer on the baseline release would notice at the current tree. */
export function diffSurface(baseline, current) {
    const removed = [];
    const changed = [];
    const added = [];
    for (const [key, was] of baseline) {
        if (!current.has(key)) removed.push({ key, change: 'removed', was });
        else if (current.get(key) !== was) changed.push({ key, change: 'changed', was, now: current.get(key) });
    }
    for (const key of current.keys()) if (!baseline.has(key)) added.push(key);
    return { removed, changed, added };
}

/**
 * Set the recorded exceptions against the breaks actually found.
 *
 * An exception is granted against ONE baseline release (`since`). Once a later release is
 * the baseline it has done its job and is only reported as expired: failing on it would turn
 * `main` red the moment a release is tagged, with no commit to blame. An exception for the
 * CURRENT baseline that matches no break is different. It claims a licence nobody is using,
 * and it would silently cover the next person who makes exactly that break, so it fails.
 */
export function reconcile(breaks, exceptions, baselineTag) {
    const malformed = exceptions.filter((e) => !e || !e.key || !e.since || !e.reason || !['removed', 'changed'].includes(e.change));
    const wellFormed = exceptions.filter((e) => !malformed.includes(e));
    const live = wellFormed.filter((e) => e.since === baselineTag);
    const expired = wellFormed.filter((e) => e.since !== baselineTag);

    const covers = (e, b) => e.key === b.key && e.change === b.change;
    const unexcused = breaks.filter((b) => !live.some((e) => covers(e, b)));
    const excused = breaks.filter((b) => live.some((e) => covers(e, b)));
    const unused = live.filter((e) => !breaks.some((b) => covers(e, b)));

    return { unexcused, excused, unused, expired, malformed };
}
