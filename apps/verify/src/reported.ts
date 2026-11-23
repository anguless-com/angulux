import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from '@anguless/angulux/checkbox';
import { DialogModule } from '@anguless/angulux/dialog';
import { DrawerModule } from '@anguless/angulux/drawer';
import { MessageService } from '@anguless/angulux/api';
import { SelectModule } from '@anguless/angulux/select';
import { ToastModule } from '@anguless/angulux/toast';
import { TooltipModule } from '@anguless/angulux/tooltip';

/**
 * Scenes for defects reported against a published version, one per `?case=`.
 * e2e/reported-issues.spec.ts drives them; each test names the issue it measures.
 *
 * - `checkbox-mixed` (#258): an indeterminate checkbox next to an unchecked and a checked one.
 * - `select-filter-keys` (#256): a Select with the filter on, one without, and one whose filter
 *   does not take focus.
 * - `drawer-sheet` (#257): a modal bottom drawer holding a dialog, a modal drawer that does not
 *   close on Escape, a drawer without a header, one the app names through `pt`, one with
 *   `autoZIndex` off, one with nothing to focus, and a drawer that is not modal.
 * - `drawer-layers` (22.6.14): a modal drawer on a page that also shows a toast and a tooltip,
 *   with a dialog beside it and not inside it. None of the three is a layer Escape should stop at.
 * - `dialog-layers`: a modal dialog on a page that also shows a toast and a tooltip. Neither is a
 *   layer Escape should stop at.
 */
const CASE = new URLSearchParams(location.search).get('case') ?? '';

@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, CheckboxModule, DialogModule, DrawerModule, SelectModule, ToastModule, TooltipModule],
    providers: [MessageService],
    template: `
        <h1>angulux — reported defects</h1>
        @switch (kase) {
            @case ('checkbox-mixed') {
                <section id="sec-checkbox-mixed">
                    <agl-checkbox inputId="cm-mixed" [binary]="true" [indeterminate]="mixed()" [(ngModel)]="mixedValue" ariaLabel="Select page" />
                    <agl-checkbox inputId="cm-off" [binary]="true" [(ngModel)]="offValue" ariaLabel="Plain, off" />
                    <agl-checkbox inputId="cm-on" [binary]="true" [(ngModel)]="onValue" ariaLabel="Plain, on" />
                    <agl-checkbox inputId="cm-readonly" [binary]="true" [indeterminate]="true" [readonly]="true" [(ngModel)]="readonlyValue" ariaLabel="Read-only, mixed" />
                    <button id="cm-set-mixed" type="button" (click)="mixed.set(true)">mixed again</button>
                    <button id="cm-clear-mixed" type="button" (click)="mixed.set(false)">not mixed</button>
                </section>
            }
            @case ('select-filter-keys') {
                <section id="sec-select-filter-keys" style="display: flex; gap: 2rem">
                    <agl-select inputId="sf-filter" [options]="words" [filter]="true" placeholder="filter" [(ngModel)]="filterValue" />
                    <agl-select inputId="sf-plain" [options]="words" placeholder="no filter" [(ngModel)]="plainValue" />
                    <agl-select inputId="sf-nofocus" [options]="words" [filter]="true" [autofocusFilter]="false" placeholder="filter without focus" [(ngModel)]="noFocusValue" />
                </section>
            }
            @case ('drawer-sheet') {
                <section id="sec-drawer-sheet">
                    <button id="ds-open" type="button" (click)="sheet.set(true)">open the sheet</button>
                    <button id="ds-open-pinned" type="button" (click)="pinned.set(true)">open the drawer that ignores Escape</button>
                    <button id="ds-open-bare" type="button" (click)="bare.set(true)">open the drawer without a header</button>
                    <button id="ds-open-custom" type="button" (click)="custom.set(true)">open the drawer the app names</button>
                    <button id="ds-open-flat" type="button" (click)="flat.set(true)">open the drawer without a z-index of its own</button>
                    <button id="ds-open-empty" type="button" (click)="empty.set(true)">open the drawer with nothing to focus</button>
                    <button id="ds-open-side" type="button" (click)="side.set(true)">open the drawer that is not modal</button>

                    <agl-drawer id="ds-sheet" position="bottom" header="Filters" [style]="{ height: '24rem' }" [visible]="sheet()" (visibleChange)="sheet.set($event)">
                        <input id="ds-field" type="text" aria-label="Keyword" />
                        <button id="ds-open-dialog" type="button" (click)="dialog.set(true)">open the dialog</button>
                        <agl-dialog id="ds-dialog" header="Confirm" [modal]="true" [visible]="dialog()" (visibleChange)="dialog.set($event)">
                            <button id="ds-dialog-ok" type="button" (click)="dialog.set(false)">OK</button>
                        </agl-dialog>
                    </agl-drawer>

                    <agl-drawer id="ds-pinned" header="Pinned" [closeOnEscape]="false" [visible]="pinned()" (visibleChange)="pinned.set($event)">
                        <button id="ds-pinned-button" type="button">inside</button>
                    </agl-drawer>

                    <agl-drawer id="ds-bare" [visible]="bare()" (visibleChange)="bare.set($event)">
                        <p>No header text.</p>
                    </agl-drawer>

                    <agl-drawer id="ds-custom" header="Named by the app" [pt]="{ root: { role: 'region', 'aria-label': 'Custom name' } }" [visible]="custom()" (visibleChange)="custom.set($event)">
                        <p>The app names it.</p>
                    </agl-drawer>

                    <agl-drawer id="ds-flat" header="Flat" [autoZIndex]="false" [visible]="flat()" (visibleChange)="flat.set($event)">
                        <button id="ds-flat-button" type="button">inside</button>
                    </agl-drawer>

                    <agl-drawer id="ds-empty" [closable]="false" [visible]="empty()" (visibleChange)="empty.set($event)">
                        <p>Nothing to focus.</p>
                    </agl-drawer>

                    <agl-drawer id="ds-side" header="Side" position="right" [modal]="false" [visible]="side()" (visibleChange)="side.set($event)">
                        <button id="ds-side-button" type="button">inside</button>
                    </agl-drawer>
                </section>
            }
            @case ('drawer-layers') {
                <section id="sec-drawer-layers">
                    <button id="dl-open" type="button" (click)="layered.set(true)">open the drawer</button>
                    <agl-toast />

                    <agl-drawer id="dl-drawer" header="Details" position="right" [visible]="layered()" (visibleChange)="layered.set($event)">
                        <button id="dl-toast" type="button" (click)="toast()">show a toast that stays</button>
                        <button id="dl-open-dialog" type="button" aglTooltip="View full size" (click)="lightbox.set(true)">open the dialog beside the drawer</button>
                        <agl-select inputId="dl-select" [options]="words" appendTo="body" placeholder="a list over the drawer" [(ngModel)]="plainValue" />
                    </agl-drawer>

                    <agl-dialog id="dl-dialog" header="Preview" [modal]="true" [visible]="lightbox()" (visibleChange)="lightbox.set($event)">
                        <p>Preview.</p>
                    </agl-dialog>
                </section>
            }
            @case ('dialog-layers') {
                <section id="sec-dialog-layers">
                    <button id="gl-open" type="button" (click)="lightbox.set(true)">open the dialog</button>
                    <agl-toast />

                    <agl-dialog id="gl-dialog" header="Preview" [modal]="true" [visible]="lightbox()" (visibleChange)="lightbox.set($event)">
                        <button id="gl-toast" type="button" aglTooltip="Stays on screen" (click)="toast()">show a toast that stays</button>
                        <agl-select inputId="gl-select" [options]="words" appendTo="body" placeholder="a list over the dialog" [(ngModel)]="plainValue" />
                    </agl-dialog>
                </section>
            }
        }
    `
})
export class Reported {
    readonly kase = CASE;

    readonly mixed = signal(true);
    mixedValue = false;
    offValue = false;
    onValue = true;
    readonlyValue = false;

    readonly words = ['alpha', 'abacus', 'abcde', 'bravo', 'butter', 'cedar', 'cobalt', 'delta', 'ember', 'fennel', 'garnet', 'harbor', 'indigo', 'juniper', 'kestrel', 'lumen', 'maple', 'nectar', 'onyx', 'pebble'];
    filterValue: string | null = null;
    plainValue: string | null = null;
    noFocusValue: string | null = null;

    readonly sheet = signal(false);
    readonly dialog = signal(false);
    readonly pinned = signal(false);
    readonly bare = signal(false);
    readonly custom = signal(false);
    readonly flat = signal(false);
    readonly empty = signal(false);
    readonly side = signal(false);

    readonly layered = signal(false);
    readonly lightbox = signal(false);
    private readonly messages = inject(MessageService);

    toast(): void {
        this.messages.add({ severity: 'info', summary: 'Saved', detail: 'This one stays until it is closed.', sticky: true });
    }
}
