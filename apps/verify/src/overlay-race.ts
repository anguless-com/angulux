import { Component, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from '@anguless/angulux/datepicker';
import { MultiSelect, MultiSelectModule } from '@anguless/angulux/multiselect';
import { SelectModule } from '@anguless/angulux/select';

/**
 * Panels that open with an enter motion, closed again before that motion starts.
 * e2e/overlay-race.spec.ts opens and closes each one a set number of frames apart, and requires
 * the panel to end closed.
 *
 * Select and DatePicker are driven by two clicks on their trigger. MultiSelect ignores a second
 * click within 150 ms of the first, so it is driven through its own show() and hide(), which the
 * page exposes as `window.__aglMultiSelect`.
 */
@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, SelectModule, MultiSelectModule, DatePickerModule],
    template: `
        <h1>angulux — open, then close at once</h1>
        <section style="display: flex; gap: 2rem; margin: 2rem">
            <agl-select id="race-select" [options]="cities" [(ngModel)]="city" placeholder="City" />
            <agl-multiselect id="race-multiselect" [options]="cities" [(ngModel)]="picked" placeholder="Cities" />
            <agl-datepicker id="race-datepicker" [(ngModel)]="date" [showIcon]="true" />
        </section>
    `
})
export class OverlayRace {
    readonly cities = ['Hanoi', 'Da Nang', 'Hue', 'Can Tho'];
    city: string | null = null;
    picked: string[] = [];
    date: Date | null = null;

    private readonly multiSelect = viewChild.required(MultiSelect);

    constructor() {
        (window as unknown as { __aglMultiSelect: { show: () => void; hide: () => void } }).__aglMultiSelect = {
            show: () => this.multiSelect().show(),
            hide: () => this.multiSelect().hide()
        };
    }
}
