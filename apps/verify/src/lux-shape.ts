import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@anguless/angulux/button';
import { CardModule } from '@anguless/angulux/card';
import { CheckboxModule } from '@anguless/angulux/checkbox';
import { InputTextModule } from '@anguless/angulux/inputtext';
import { MessageModule } from '@anguless/angulux/message';
import { PaginatorModule } from '@anguless/angulux/paginator';
import { RadioButtonModule } from '@anguless/angulux/radiobutton';
import { SelectModule } from '@anguless/angulux/select';
import { TableModule } from '@anguless/angulux/table';
import { TabsModule } from '@anguless/angulux/tabs';
import { TagModule } from '@anguless/angulux/tag';
import { ToggleSwitchModule } from '@anguless/angulux/toggleswitch';

/**
 * One screen of ordinary application UI (buttons, a form in a card, messages, tabs, a table and a
 * paginator), for measuring the shape of a preset: how tall a control is, how round, how wide the
 * focus ring. e2e/lux-shape.spec.ts reads those off this page.
 *
 * `?preset=` names the preset (main.ts): the upstream one Lux was derived from, Lux, or Lux Compact.
 * The numbers in the README of packages/angulux-themes are the ones measured here.
 */
@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, ButtonModule, CardModule, CheckboxModule, InputTextModule, MessageModule, PaginatorModule, RadioButtonModule, SelectModule, TableModule, TabsModule, TagModule, ToggleSwitchModule],
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
        .stack {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
        }
        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .field label {
            font-size: 0.875rem;
            font-weight: 500;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        input,
        agl-select {
            width: 100%;
        }
    `,
    template: `
        <main>
            <div class="stack">
                <div class="row" id="buttons">
                    <agl-button id="probe-button" label="Save" />
                    <agl-button label="Cancel" severity="secondary" />
                    <agl-button label="Export" variant="outlined" />
                    <agl-button label="Delete" severity="danger" />
                    <agl-button label="Learn more" variant="text" />
                </div>

                <agl-card header="Account" subheader="Details used on invoices">
                    <div class="stack">
                        <div class="grid">
                            <div class="field">
                                <label for="name">Full name</label>
                                <input id="name" aglInputText [(ngModel)]="name" />
                            </div>
                            <div class="field">
                                <label for="email">Email</label>
                                <input id="email" aglInputText [(ngModel)]="email" placeholder="name@example.com" />
                            </div>
                        </div>
                        <div class="field">
                            <label for="city">City</label>
                            <agl-select inputId="city" [(ngModel)]="city" [options]="cities" optionLabel="name" placeholder="Select a city" />
                        </div>
                        <div class="row">
                            <agl-checkbox [(ngModel)]="newsletter" [binary]="true" inputId="newsletter" />
                            <label for="newsletter">Send me the newsletter</label>
                        </div>
                        <div class="row">
                            @for (plan of plans; track plan) {
                                <agl-radioButton [(ngModel)]="selectedPlan" [value]="plan" [inputId]="plan" name="plan" />
                                <label [for]="plan">{{ plan }}</label>
                            }
                            <span style="flex: 1"></span>
                            <agl-toggleSwitch [(ngModel)]="notifications" ariaLabel="Notifications" />
                        </div>
                    </div>
                    <ng-template #footer>
                        <div class="row" style="justify-content: flex-end">
                            <agl-button label="Cancel" severity="secondary" [outlined]="true" />
                            <agl-button label="Save changes" />
                        </div>
                    </ng-template>
                </agl-card>

                <agl-message severity="success">Your changes were saved.</agl-message>
                <agl-message severity="warn">The invoice address is incomplete.</agl-message>

                <agl-tabs value="0">
                    <agl-tablist>
                        <agl-tab value="0">Orders</agl-tab>
                        <agl-tab value="1">Returns</agl-tab>
                        <agl-tab value="2">Invoices</agl-tab>
                    </agl-tablist>
                    <agl-tabpanels>
                        <agl-tabpanel value="0">
                            <agl-table [value]="orders">
                                <ng-template #header>
                                    <tr>
                                        <th>Order</th>
                                        <th>Customer</th>
                                        <th>Status</th>
                                        <th>Total</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-order>
                                    <tr>
                                        <td>{{ order.code }}</td>
                                        <td>{{ order.customer }}</td>
                                        <td><agl-tag [value]="order.status" [severity]="order.severity" /></td>
                                        <td>{{ order.total }}</td>
                                    </tr>
                                </ng-template>
                            </agl-table>
                            <agl-paginator [first]="0" [rows]="5" [totalRecords]="48" />
                        </agl-tabpanel>
                        <agl-tabpanel value="1"><p>No returns.</p></agl-tabpanel>
                        <agl-tabpanel value="2"><p>No invoices.</p></agl-tabpanel>
                    </agl-tabpanels>
                </agl-tabs>
            </div>
        </main>
    `
})
export class LuxShape {
    name = 'Nguyen Van An';
    email = '';
    cities = [{ name: 'Hanoi' }, { name: 'Da Nang' }, { name: 'Ho Chi Minh City' }];
    city: { name: string } | undefined;
    newsletter = true;
    plans = ['Monthly', 'Yearly'];
    selectedPlan = 'Yearly';
    notifications = true;
    orders = [
        { code: 'A-1042', customer: 'Bamboo Co.', status: 'Paid', severity: 'success', total: '1,240.00' },
        { code: 'A-1043', customer: 'Blue Band', status: 'Pending', severity: 'warn', total: '86.50' },
        { code: 'A-1044', customer: 'Lotus Studio', status: 'Failed', severity: 'danger', total: '412.00' },
        { code: 'A-1045', customer: 'Red River', status: 'Paid', severity: 'success', total: '2,005.10' },
        { code: 'A-1046', customer: 'Saigon Works', status: 'Draft', severity: 'secondary', total: '59.00' }
    ];
}
