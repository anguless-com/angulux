import { Component, computed, effect, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AvatarModule } from '@anguless/angulux/avatar';
import { ButtonModule } from '@anguless/angulux/button';
import { CardModule } from '@anguless/angulux/card';
import { CheckboxModule } from '@anguless/angulux/checkbox';
import { InputTextModule } from '@anguless/angulux/inputtext';
import { ProgressBarModule } from '@anguless/angulux/progressbar';
import { SelectModule } from '@anguless/angulux/select';
import { SelectButtonModule } from '@anguless/angulux/selectbutton';
import { TableModule } from '@anguless/angulux/table';
import { TagModule } from '@anguless/angulux/tag';
import { ToggleSwitchModule } from '@anguless/angulux/toggleswitch';
import { PresetChoice, PresetId } from '../preset-choice';

type Status = 'All' | 'Paid' | 'Pending' | 'Failed';

interface Order {
    code: string;
    customer: string;
    initials: string;
    status: Exclude<Status, 'All'>;
    total: string;
}

const SEVERITY: Record<Order['status'], 'success' | 'warn' | 'danger'> = { Paid: 'success', Pending: 'warn', Failed: 'danger' };

/**
 * A screen of an ordinary application, built from the library, at the top of the home page: what a
 * reader gets is on screen before anything is said about it.
 *
 * Everything here is a real angulux component in the site's preset, and the switch at the top
 * swaps that preset for the whole site (PresetChoice). Nothing is styled to look better than it
 * will in a reader's application; the layout around the components is the only hand-written CSS.
 *
 * Hydrated, unlike the demos, and late. home.ts wraps it in `@defer (hydrate on hover)`: the
 * server renders it in full, and its code loads only when a pointer or focus reaches it, so the
 * first screen of a phone does not pay for it. A click or key press made before the code arrives
 * is replayed once it has, and that replay is why this is hydrated: a component rendered afresh
 * instead (`ngSkipHydration`, as demo-host.ts does) replaces the element the reader clicked, and
 * the click is lost.
 *
 * Hydration is safe here only because every component on this screen survives it, which is not
 * true of the library at large (demo-host.ts names the DatePicker). e2e/home-preview.spec.ts
 * compares this screen hydrated with the same screen rendered by the client alone, element by
 * element. A component added here has to pass that.
 *
 * `data-hydrates-later` tells the browser tests that this subtree is meant to stay server markup
 * until it is reached (e2e/hydrated.ts).
 */
@Component({
    selector: 'agl-home-preview',
    imports: [FormField, AvatarModule, ButtonModule, CardModule, CheckboxModule, InputTextModule, ProgressBarModule, SelectModule, SelectButtonModule, TableModule, TagModule, ToggleSwitchModule],
    host: { class: 'block', 'data-hydrates-later': '' },
    template: `
        <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-muted">Live components, in the preset this site uses.</p>
            <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-ink" id="preview-preset">Preset</span>
                <agl-selectButton [formField]="f.preset" [options]="presets" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="preview-preset" />
            </div>
        </div>

        <!-- grid-cols-1 rather than no column count: an implicit column is as wide as its widest
             content, and the table's 30rem minimum pushed every card off a phone screen. -->
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <agl-card header="Invite a teammate" class="min-w-0">
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="preview-email">Email</label>
                        <input id="preview-email" aglInputText [formField]="f.email" placeholder="name@company.com" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="preview-role">Role</label>
                        <agl-select inputId="preview-role" [formField]="f.role" [options]="roles" class="w-full" />
                    </div>
                    <div class="flex items-center gap-2">
                        <agl-checkbox inputId="preview-refunds" [formField]="f.refunds" [binary]="true" />
                        <label class="text-sm" for="preview-refunds">Can approve refunds</label>
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <agl-button label="Cancel" severity="secondary" [outlined]="true" />
                        <agl-button label="Send invite" />
                    </div>
                </ng-template>
            </agl-card>

            <agl-card header="Notifications" class="min-w-0">
                <div class="flex flex-col gap-4">
                    @for (item of notifications; track item.id) {
                        <div class="flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <label class="block text-sm font-medium" [for]="item.id">{{ item.label }}</label>
                                <span class="block text-xs text-muted">{{ item.hint }}</span>
                            </div>
                            <agl-toggleSwitch [inputId]="item.id" [formField]="f[item.field]" />
                        </div>
                    }
                    <div class="flex flex-col gap-1.5 border-t border-line pt-4">
                        <div class="flex justify-between text-sm">
                            <span class="font-medium" id="preview-storage">Storage</span>
                            <span class="text-muted">6.8 of 10 GB</span>
                        </div>
                        <agl-progressBar [value]="68" [showValue]="false" aria-labelledby="preview-storage" />
                    </div>
                </div>
            </agl-card>

            <agl-card header="Recent orders" class="min-w-0 sm:col-span-2">
                <div class="mb-3 flex flex-wrap items-center gap-2">
                    <span class="text-sm text-muted" id="preview-filter">Show</span>
                    <agl-selectButton [formField]="f.status" [options]="statuses" [allowEmpty]="false" ariaLabelledBy="preview-filter" />
                </div>
                <div class="overflow-x-auto">
                    <agl-table [value]="rows()" [tableStyle]="{ 'min-width': '30rem' }">
                        <ng-template #header>
                            <tr>
                                <th>Order</th>
                                <th>Customer</th>
                                <th>Status</th>
                                <!-- Inline, because the table's own cell rule is unlayered and beats a utility class. -->
                                <th style="text-align: end">Total</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-order>
                            <tr>
                                <td class="font-mono text-[13px]">{{ order.code }}</td>
                                <td>
                                    <span class="inline-flex items-center gap-2">
                                        <agl-avatar [label]="order.initials" shape="circle" />
                                        {{ order.customer }}
                                    </span>
                                </td>
                                <td><agl-tag [value]="order.status" [severity]="severity(order.status)" /></td>
                                <td class="tabular-nums" style="text-align: end">{{ order.total }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                </div>
            </agl-card>
        </div>
    `
})
export class HomePreview {
    private readonly choice = inject(PresetChoice);

    readonly presets: { label: string; value: PresetId }[] = [
        { label: 'Lux', value: 'lux' },
        { label: 'Lux Compact', value: 'compact' }
    ];

    readonly roles = ['Viewer', 'Editor', 'Admin'];

    readonly statuses: Status[] = ['All', 'Paid', 'Pending', 'Failed'];

    readonly notifications = [
        { id: 'preview-orders', field: 'orders', label: 'New orders', hint: 'An email for every order placed' },
        { id: 'preview-digest', field: 'digest', label: 'Weekly digest', hint: 'A summary every Monday' }
    ] as const;

    private readonly orders: Order[] = [
        { code: 'A-1042', customer: 'Bamboo Co.', initials: 'BC', status: 'Paid', total: '1,240.00' },
        { code: 'A-1043', customer: 'Blue Band', initials: 'BB', status: 'Pending', total: '86.50' },
        { code: 'A-1044', customer: 'Lotus Studio', initials: 'LS', status: 'Failed', total: '412.00' },
        { code: 'A-1045', customer: 'Red River', initials: 'RR', status: 'Paid', total: '2,005.10' }
    ];

    private readonly model = signal({
        preset: this.choice.current(),
        email: '',
        role: 'Editor',
        refunds: true,
        orders: true,
        digest: false,
        status: 'All' as Status
    });

    readonly f = form(this.model);

    readonly rows = computed(() => {
        const status = this.model().status;
        return status === 'All' ? this.orders : this.orders.filter((order) => order.status === status);
    });

    constructor() {
        effect(() => {
            void this.choice.choose(this.model().preset);
        });
    }

    severity(status: Order['status']): 'success' | 'warn' | 'danger' {
        return SEVERITY[status];
    }
}
