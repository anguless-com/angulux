import { Component, signal, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from '@anguless/angulux/api';
import { ButtonModule } from '@anguless/angulux/button';
import { DatePickerModule } from '@anguless/angulux/datepicker';
import { DialogModule } from '@anguless/angulux/dialog';
import { IconFieldModule } from '@anguless/angulux/iconfield';
import { InputIconModule } from '@anguless/angulux/inputicon';
import { InputTextModule } from '@anguless/angulux/inputtext';
import { MessageModule } from '@anguless/angulux/message';
import { MultiSelectModule } from '@anguless/angulux/multiselect';
import { PaginatorModule } from '@anguless/angulux/paginator';
import { SelectModule } from '@anguless/angulux/select';
import { TableModule } from '@anguless/angulux/table';
import { TabsModule } from '@anguless/angulux/tabs';
import { TieredMenuModule } from '@anguless/angulux/tieredmenu';
import { TooltipModule } from '@anguless/angulux/tooltip';

/**
 * Third upstream probe page: the changelog entries of PrimeNG 22.1.5 (2026-11-12) that name a
 * module angulux ships, other than Select.
 *
 * Same rules as upstream-22-1.ts. Each scene is written from OUR source and measured in the
 * browser; the only thing taken from upstream is the published sentence that a defect exists.
 * One scene per `?case=`.
 */
const PARAMS = new URLSearchParams(location.search);
const CASE = PARAMS.get('case') ?? '';
const VARIANT = PARAMS.get('v') ?? '';

/** A day in a fixed month, so a probe never depends on the date the gate happens to run. */
const at = (day: number): Date => new Date(2026, 2, day, 0, 0, 0, 0);

/**
 * The saved states the table-state scene restores, keyed by `?v=`. Each is what Table writes
 * for a filter the user cleared, in one of the shapes its two filter displays produce.
 */
const SAVED_STATES: Record<string, unknown> = {
    'row-empty-string': { filters: { name: { value: '', matchMode: 'startsWith' } } },
    'row-null': { filters: { name: { value: null, matchMode: 'startsWith' } } },
    'menu-null': { filters: { name: [{ value: null, matchMode: 'startsWith', operator: 'and' }] } },
    'menu-empty-list': { filters: { name: [] } },
    'row-value': { filters: { name: { value: 'Ha', matchMode: 'startsWith' } } }
};

if (CASE === 'table-state') {
    const state = SAVED_STATES[VARIANT];
    if (state) sessionStorage.setItem('verify-table-state', JSON.stringify(state));
}

/** Records, for a pass-through function, which component the Tooltip-related probe sees as parent. */
const parentSeen: Record<string, string> = {};
(window as unknown as { __aglParentSeen: Record<string, string> }).__aglParentSeen = parentSeen;
const recordParent = (key: string) => (options: { parent?: { instance?: { componentName?: string; constructor?: { name?: string } } } }) => {
    const parent = options?.parent?.instance;
    parentSeen[key] = parent ? (parent.componentName ?? parent.constructor?.name ?? 'unnamed') : 'none';
    return {};
};

interface City {
    name: string;
    code: string;
}

@Component({
    selector: 'agl-verify-root',
    encapsulation: ViewEncapsulation.None,
    imports: [
        FormsModule,
        ButtonModule,
        DatePickerModule,
        DialogModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
        MessageModule,
        MultiSelectModule,
        PaginatorModule,
        SelectModule,
        TableModule,
        TabsModule,
        TieredMenuModule,
        TooltipModule
    ],
    styles: [
        `
            .tabs-fill .p-tablist-tab-list .p-tab {
                flex: 1 1 0;
            }
            .tt-row {
                display: flex;
                gap: 2rem;
                align-items: center;
                margin: 3rem 6rem;
            }
        `
    ],
    template: `
        <h1>angulux — upstream 22.1.5 probes</h1>
        @switch (kase) {
            <!-- Tooltip (22.1.5): one target per option the entries name. Every target sits well inside
                 the viewport, so the first position tried is the one that fits. -->
            @case ('tooltip') {
                <section id="sec-tooltip">
                    <div class="tt-row">
                        <button id="tt-hover" type="button" aglTooltip="Hover tip" tooltipPosition="top">hover</button>
                        <button id="tt-both" type="button" aglTooltip="Both tip" tooltipEvent="both">both</button>
                        <input id="tt-focus" aglTooltip="Focus tip" tooltipEvent="focus" placeholder="focus" />
                        <button id="tt-undef-opt" type="button" aglTooltip="Undefined option" [tooltipOptions]="undefinedPosition">undefined option</button>
                        <button id="tt-undef-input" type="button" aglTooltip="Undefined input" [tooltipPosition]="noPosition">undefined input</button>
                    </div>
                    <div class="tt-row">
                        <button id="before-persist" type="button">before</button>
                        <button id="tt-persist" type="button" [aglTooltip]="persistentHtml" [escape]="false" [autoHide]="false" tooltipEvent="both" tooltipPosition="bottom">persistent</button>
                        <button id="after-persist" type="button">after</button>
                    </div>
                    <div class="tt-row">
                        <agl-button id="tt-host" aglTooltip="Host tip" label="host" [pt]="{ root: recordParent('host-with-tooltip') }" />
                        <agl-button id="tt-host-plain" label="plain" [pt]="{ root: recordParent('host-without-tooltip') }" />
                        <div id="tt-wrapper" aglTooltip="Wrapper tip">
                            <agl-button id="tt-wrapped" label="wrapped" [pt]="{ root: recordParent('inside-a-tooltip-element') }" />
                        </div>
                        <agl-iconfield>
                            <agl-inputicon id="tt-inputicon" aglTooltip="Icon tip" styleClass="pi pi-search" [pt]="{ root: recordParent('inputicon-with-tooltip') }" />
                            <input aglInputText placeholder="icon field" />
                        </agl-iconfield>
                        <agl-iconfield id="tt-iconfield-host" aglTooltip="Field tip">
                            <agl-inputicon id="tt-inputicon-in-host" styleClass="pi pi-search" [pt]="{ root: recordParent('inputicon-in-iconfield-with-tooltip') }" />
                            <input aglInputText placeholder="icon field with a tooltip" />
                        </agl-iconfield>
                        <agl-iconfield>
                            <agl-inputicon id="tt-inputicon-plain" styleClass="pi pi-search" [pt]="{ root: recordParent('inputicon-without-tooltip') }" />
                            <input aglInputText placeholder="icon field" />
                        </agl-iconfield>
                    </div>
                </section>
            }

            <!-- Tooltip (22.1.5): a tooltip inside an open modal dialog. -->
            @case ('tooltip-dialog') {
                <!-- Hover only: the scene times a hovered tooltip. The dialog puts focus on its button
                     when it opens, and with the default event a focused target shows its tooltip too. -->
                <section id="sec-tooltip-dialog">
                    <button id="tt-plain-outside" type="button" aglTooltip="Outside tip" tooltipEvent="hover">outside</button>
                    <agl-dialog header="Dialog with a tooltip" [visible]="true" [modal]="false" [closable]="false" [draggable]="false" position="bottom">
                        <button id="tt-in-dialog" type="button" aglTooltip="Dialog tip" tooltipEvent="hover">in the dialog</button>
                    </agl-dialog>
                </section>
            }

            <!-- Tooltip (22.1.5): a large menu with nested items, every item carrying a tooltip. -->
            @case ('tooltip-menu') {
                <section id="sec-tooltip-menu">
                    <agl-tieredmenu id="tt-menu" [model]="bigMenu" />
                </section>
            }

            <!-- Tabs (22.1.5): tabs that share the width of their container, which then narrows. -->
            @case ('tabs-resize') {
                <section id="sec-tabs-resize">
                    <button id="tabs-narrow" type="button" (click)="tabsWidth.set(320)">narrow</button>
                    <div id="tabs-box" class="tabs-fill" [style.width.px]="tabsWidth()">
                        <agl-tabs value="0">
                            <agl-tablist>
                                <agl-tab value="0">First</agl-tab>
                                <agl-tab value="1">Second</agl-tab>
                                <agl-tab value="2">Third</agl-tab>
                            </agl-tablist>
                            <agl-tabpanels>
                                <agl-tabpanel value="0">one</agl-tabpanel>
                                <agl-tabpanel value="1">two</agl-tabpanel>
                                <agl-tabpanel value="2">three</agl-tabpanel>
                            </agl-tabpanels>
                        </agl-tabs>
                    </div>
                </section>
            }

            <!-- Message (22.1.5): a closable message between two buttons, closed by its own button. -->
            @case ('message-close') {
                <section id="sec-message-close">
                    <button id="before-msg" type="button">before</button>
                    <agl-message id="msg" severity="info" text="A closable message" [closable]="true" />
                    <button id="after-msg" type="button">after</button>
                </section>
            }

            <!-- Table (22.1.5): a sortable column with a resizer, in expand mode. -->
            @case ('table-resize') {
                <section id="sec-table-resize">
                    <agl-table [value]="cities" [resizableColumns]="true" columnResizeMode="expand" [tableStyle]="{ 'min-width': '30rem' }">
                        <ng-template #header>
                            <tr>
                                <th id="th-name" aglSortableColumn="name" aglResizableColumn>Name <agl-sortIcon field="name" /></th>
                                <th id="th-code" aglResizableColumn>Code</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-city>
                            <tr>
                                <td>{{ city.name }}</td>
                                <td>{{ city.code }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                </section>
            }

            <!-- Table (22.1.5): a table restoring a saved state whose filter was cleared (?v= picks the shape). -->
            @case ('table-state') {
                <section id="sec-table-state">
                    <agl-table [value]="cities" stateKey="verify-table-state" stateStorage="session" [globalFilterFields]="['name']">
                        <ng-template #header>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-city>
                            <tr class="state-row">
                                <td>{{ city.name }}</td>
                                <td>{{ city.code }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                </section>
            }

            <!-- DatePicker (22.1.5): Today pressed while another month is shown, then Previous / Next. -->
            @case ('dp-today') {
                <section id="sec-dp-today">
                    <agl-datepicker id="dp-today-inline" [inline]="true" [showButtonBar]="true" [ngModel]="dpToday()" (ngModelChange)="dpToday.set($event)" />
                </section>
            }

            <!-- Forms (22.1.5): components that bind ngModel inside their own templates, inside a form. -->
            @case ('forms-internal') {
                <section id="sec-forms-internal">
                    <form id="internal-form">
                        <agl-paginator [rows]="10" [totalRecords]="120" [rowsPerPageOptions]="[10, 20]" [showJumpToPageDropdown]="true" [showJumpToPageInput]="true" />
                        <agl-multiselect name="cities" [options]="cities" optionLabel="name" [(ngModel)]="formCities" [showToggleAll]="true" />
                        <agl-table [value]="cities" [paginator]="true" [rows]="2" [rowsPerPageOptions]="[2, 4]" selectionMode="multiple" [(selection)]="formSelection" dataKey="code">
                            <ng-template #header>
                                <tr>
                                    <th><agl-tableHeaderCheckbox /></th>
                                    <th>Name <agl-columnFilter type="text" field="name" display="menu" /></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-city>
                                <tr>
                                    <td><agl-tableCheckbox [value]="city" /></td>
                                    <td>{{ city.name }}</td>
                                </tr>
                            </ng-template>
                        </agl-table>
                    </form>
                </section>
            }

            <!-- Core (22.1.5): item templates whose root is a control-flow block, against the same template
                 without it, in a long list. ?v=block or ?v=plain. -->
            @case ('core-template') {
                <section id="sec-core-template">
                    @if (variant === 'block') {
                        <agl-select inputId="core-select" [options]="manyCities" optionLabel="name" placeholder="many" scrollHeight="300px">
                            <ng-template #item let-city>
                                @if (city) {
                                    <span class="core-item">{{ city.name }}</span>
                                }
                            </ng-template>
                        </agl-select>
                    } @else {
                        <agl-select inputId="core-select" [options]="manyCities" optionLabel="name" placeholder="many" scrollHeight="300px">
                            <ng-template #item let-city>
                                <span class="core-item">{{ city.name }}</span>
                            </ng-template>
                        </agl-select>
                    }
                </section>
            }

            @default {
                <p id="no-case">no case: {{ kase }}</p>
            }
        }
    `
})
export class Upstream2215 {
    readonly kase = CASE;
    readonly variant = VARIANT;
    readonly recordParent = recordParent;

    readonly undefinedPosition = { tooltipPosition: undefined };
    readonly noPosition: 'right' | undefined = undefined;
    readonly persistentHtml = 'Persistent <a id="tt-link" href="#tt-link">a link inside</a>';

    cities: City[] = [
        { name: 'Hanoi', code: 'HN' },
        { name: 'Da Nang', code: 'DN' },
        { name: 'Hue', code: 'HU' },
        { name: 'Ho Chi Minh City', code: 'HCM' }
    ];

    manyCities: City[] = Array.from({ length: 2000 }, (_, i) => ({ name: `City ${i}`, code: `C${i}` }));

    /** Forty top-level items with six children each, every item carrying a tooltip. */
    bigMenu: MenuItem[] = Array.from({ length: 40 }, (_, i) => ({
        label: `Group ${i}`,
        tooltip: `Group tip ${i}`,
        tooltipOptions: { tooltipPosition: 'right' },
        items: Array.from({ length: 6 }, (_, j) => ({ label: `Item ${i}.${j}`, tooltip: `Item tip ${i}.${j}`, tooltipOptions: { tooltipPosition: 'right' } }))
    }));

    tabsWidth = signal(720);
    dpToday = signal<Date | null>(at(15));
    formCities: City[] = [];
    formSelection: City[] = [];
}
