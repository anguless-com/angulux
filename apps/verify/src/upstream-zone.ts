import { ApplicationRef, Component, inject } from '@angular/core';
import { TooltipModule } from '@anguless/angulux/tooltip';

/**
 * A zone-based page, for the one upstream entry that is about zone apps (Tooltip, 22.1.5: "each
 * hover runs change detection many times"). Everything else in the verify app is zoneless.
 *
 * main.ts loads zone.js before bootstrapping this component with zone change detection. The page
 * counts ApplicationRef.tick, which is what zone change detection runs after an event handled
 * inside the Angular zone, and exposes the count as `window.__aglTicks`.
 */
@Component({
    selector: 'agl-verify-root',
    imports: [TooltipModule],
    template: `
        <h1>angulux — zone probe</h1>
        <section id="sec-zone" style="display: flex; gap: 3rem; margin: 4rem">
            <button id="zone-plain" type="button">no tooltip</button>
            <button id="zone-tooltip" type="button" aglTooltip="Zone tip">tooltip</button>
            <button id="zone-tooltip-delay" type="button" aglTooltip="Zone tip, delayed" [showDelay]="50" [hideDelay]="50">tooltip with delays</button>
        </section>
    `
})
export class UpstreamZone {
    constructor() {
        const appRef = inject(ApplicationRef);
        const win = window as unknown as { __aglTicks: number; __aglZone: boolean };
        win.__aglTicks = 0;
        win.__aglZone = typeof (window as unknown as { Zone?: unknown }).Zone !== 'undefined';
        const tick = appRef.tick.bind(appRef);
        appRef.tick = () => {
            win.__aglTicks++;
            tick();
        };
    }
}
