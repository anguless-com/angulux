import type { ComponentFixture } from '@angular/core/testing';

/**
 * Waiting helpers for the spec suite.
 *
 * WHY THIS FILE EXISTS:
 *
 * The suite inherited 769 waits of the form `await new Promise((r) => setTimeout(r, 100))`.
 * That is a bet that 100ms is enough on whatever machine happens to be running. It is enough on
 * an idle one; on a loaded one it is not, and the suite then reports a failure in code that is
 * fine — which is worse than useless, because it teaches you to re-run instead of read. See the
 * tracking issue for the two occasions it did exactly that.
 *
 * These replace the bet with a question. Both are bounded, and neither *forces* the state it is
 * waiting for: when the deadline passes they return anyway and let the caller's own `expect`
 * deliver the verdict, so a genuine regression still reads as a failed assertion rather than as
 * a timeout from a helper.
 *
 * This file deliberately lives directly under `src/` rather than in a directory of its own:
 * every directory under `src/` is a module in the warranted closure, and a new one would have
 * to be justified to `check:scope` and `check:corpus`. A loose file is invisible to both, and
 * to the published package — nothing in any `public_api` imports it.
 */

/**
 * Wait until `predicate` holds, or the deadline passes.
 *
 * Use this when the test knows what it is waiting for — an overlay closing, a validator leaving
 * `pending`, an interval reaching its last tick. Prefer the condition the assertion is about
 * over a proxy for it: a predicate that is already true when the wait begins is not a wait, and
 * that is the trap in this kind of conversion.
 */
export async function waitUntil(predicate: () => boolean, fixture: ComponentFixture<any>, timeoutMs = 2000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate() && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        await fixture.whenStable();
    }
    // Settle through Angular's own scheduler rather than forcing a synchronous
    // `detectChanges()`. Several conditions waited on here are reached by a raw timer in a test
    // host, i.e. outside a change-detection pass; checking synchronously at that exact moment is
    // what NG0100 exists to report.
    await fixture.whenStable();
}

/**
 * Wait for the overlay to stop moving.
 *
 * `data-phase` is the mechanism rather than a proxy for it: angulux-motion sets the attribute
 * when a phase starts and removes it when the motion ends, so its absence IS "nothing is
 * animating". Asking costs nothing when no motion is running, which is why this is faster than
 * the sleeps it replaces as well as steadier.
 *
 * The single `requestAnimationFrame` is the one ordering subtlety. Change detection creates or
 * removes the overlay, and that is what starts a motion — so a frame has to pass before asking
 * whether one is in flight, or the answer is "nothing is animating" a moment too early. A frame
 * is not a duration: the browser schedules it when it is ready, so it stretches under load
 * rather than expiring under it.
 */
export async function settled(fixture: ComponentFixture<any>, timeoutMs = 2000): Promise<void> {
    await fixture.whenStable();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await waitUntil(() => !document.querySelector('[data-phase]'), fixture, timeoutMs);
}
