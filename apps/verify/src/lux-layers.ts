import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, MessageService } from '@anguless/angulux/api';
import { ButtonModule } from '@anguless/angulux/button';
import { DatePickerModule } from '@anguless/angulux/datepicker';
import { DialogModule } from '@anguless/angulux/dialog';
import { DrawerModule } from '@anguless/angulux/drawer';
import { InputTextModule } from '@anguless/angulux/inputtext';
import { MenuModule } from '@anguless/angulux/menu';
import { PopoverModule } from '@anguless/angulux/popover';
import { SelectModule } from '@anguless/angulux/select';
import { ToastModule } from '@anguless/angulux/toast';
import { TooltipModule } from '@anguless/angulux/tooltip';

/**
 * The layers that float above a page, one per `?view=`, for measuring the shape of a preset where
 * lux-shape.ts cannot: a modal dialog, the list of a select, a popup menu, a popover, a tooltip, a
 * toast, a drawer and the panel of a date picker. e2e/lux-layers.spec.ts opens each one and reads
 * its corners and its shadow.
 *
 * One layer per page load, because most of them close when another opens. `?preset=` names the
 * preset, as on lux-shape.ts (main.ts).
 */
@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, ButtonModule, DatePickerModule, DialogModule, DrawerModule, InputTextModule, MenuModule, PopoverModule, SelectModule, ToastModule, TooltipModule],
    providers: [MessageService],
    styles: `
        main {
            box-sizing: border-box;
            width: 560px;
            min-height: 100vh;
            padding: 20px;
            background: var(--p-surface-50);
            color: var(--p-text-color);
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        }
        @media (prefers-color-scheme: dark) {
            main {
                background: var(--p-surface-950);
            }
        }
        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 16px;
        }
        .field label {
            font-size: 0.875rem;
            font-weight: 500;
        }
        .field input,
        agl-select {
            width: 100%;
        }
    `,
    template: `
        <main>
            @switch (view) {
                @case ('dialog') {
                    <agl-dialog header="Delete this account?" [visible]="true" [modal]="true" [style]="{ width: '26rem' }">
                        <p style="margin: 0 0 16px">Invoices and order history are removed with it. This cannot be undone.</p>
                        <div class="field">
                            <label for="confirm">Type the account name to confirm</label>
                            <input id="confirm" aglInputText [(ngModel)]="confirm" />
                        </div>
                        <ng-template #footer>
                            <agl-button label="Cancel" severity="secondary" [outlined]="true" />
                            <agl-button label="Delete" severity="danger" />
                        </ng-template>
                    </agl-dialog>
                }
                @case ('select') {
                    <div class="field">
                        <label for="city">City</label>
                        <agl-select inputId="city" [(ngModel)]="city" [options]="cities" optionLabel="name" placeholder="Select a city" />
                    </div>
                }
                @case ('menu') {
                    <agl-button id="open" label="Actions" severity="secondary" (onClick)="menu.toggle($event)" />
                    <agl-menu #menu [model]="items" [popup]="true" />
                }
                @case ('popover') {
                    <agl-button id="open" label="Share" severity="secondary" (onClick)="popover.toggle($event)" />
                    <agl-popover #popover>
                        <div class="field" style="width: 16rem; margin: 0">
                            <label for="link">Anyone with this link can view</label>
                            <input id="link" aglInputText [(ngModel)]="link" />
                        </div>
                    </agl-popover>
                }
                @case ('tooltip') {
                    <agl-button id="open" label="Archive" severity="secondary" aglTooltip="Moves the order out of the list" tooltipPosition="bottom" />
                }
                @case ('toast') {
                    <agl-toast />
                    <agl-button id="open" label="Save" (onClick)="showToasts()" />
                }
                @case ('drawer') {
                    <agl-drawer header="Filters" [visible]="true">
                        <div class="field">
                            <label for="customer">Customer</label>
                            <input id="customer" aglInputText [(ngModel)]="confirm" />
                        </div>
                        <agl-button label="Apply" />
                    </agl-drawer>
                }
                @case ('datepicker') {
                    <div class="field">
                        <label for="due">Due date</label>
                        <agl-datePicker inputId="due" [(ngModel)]="due" />
                    </div>
                }
            }
        </main>
    `
})
export class LuxLayers {
    private readonly messages = inject(MessageService);

    readonly view = new URLSearchParams(location.search).get('view') ?? 'dialog';
    confirm = '';
    link = 'https://example.com/orders/A-1042';
    cities = [{ name: 'Hanoi' }, { name: 'Da Nang' }, { name: 'Ho Chi Minh City' }, { name: 'Hai Phong' }, { name: 'Can Tho' }];
    city: { name: string } | undefined = this.cities[1];
    due = new Date(2026, 10, 24);
    items: MenuItem[] = [
        {
            label: 'Order',
            items: [{ label: 'Duplicate' }, { label: 'Export as PDF' }, { label: 'Send to customer' }]
        },
        {
            label: 'Danger',
            items: [{ label: 'Cancel order' }]
        }
    ];

    showToasts(): void {
        this.messages.add({ severity: 'success', summary: 'Saved', detail: 'Your changes were saved.', sticky: true });
        this.messages.add({ severity: 'error', summary: 'Not sent', detail: 'The customer has no email address.', sticky: true });
    }
}
