import { NgComponentOutlet } from '@angular/common';
import { Component, input, Type } from '@angular/core';

/**
 * Where a demo runs. It exists to carry one attribute: `ngSkipHydration`.
 *
 * The page around a demo is hydrated — the prerendered HTML is kept and Angular attaches to
 * it, which is what stopped every module page from being torn down and rebuilt on load. The
 * demos themselves are not, and that is measured rather than cautious: with hydration on, the
 * inline DatePicker on `/datepicker` kept its prerendered calendar in the DOM and left it
 * hidden. The library's components were written to build their own DOM, and several finish
 * the job in lifecycle hooks that hydration does not replay the same way.
 *
 * So each demo is rendered fresh in the browser, exactly as it would be in a reader's
 * application that does not prerender — which is also the environment the unit suite and the
 * browser gate test the library in. The demo's prerendered markup still serves a crawler and
 * the first paint; it is replaced in place, at the same size, when the bundle arrives.
 */
@Component({
    selector: 'agl-demo-host',
    imports: [NgComponentOutlet],
    host: { ngSkipHydration: 'true', class: 'contents' },
    template: `<ng-container *ngComponentOutlet="component()" />`
})
export class DemoHost {
    readonly component = input.required<Type<unknown>>();
}
