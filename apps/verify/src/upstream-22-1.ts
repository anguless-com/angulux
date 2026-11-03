import { ApplicationRef, Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, StatusChangeEvent, TouchedChangeEvent, Validators, ValueChangeEvent } from '@angular/forms';
import { ConfirmationService, MenuItem, MessageService } from '@anguless/angulux/api';
import { ButtonModule } from '@anguless/angulux/button';
import { ConfirmDialogModule } from '@anguless/angulux/confirmdialog';
import { DatePickerModule } from '@anguless/angulux/datepicker';
import { DialogModule } from '@anguless/angulux/dialog';
import { DrawerModule } from '@anguless/angulux/drawer';
import { MenuModule } from '@anguless/angulux/menu';
import { MultiSelectModule } from '@anguless/angulux/multiselect';
import { SelectModule } from '@anguless/angulux/select';
import { TableLazyLoadEvent, TableModule } from '@anguless/angulux/table';
import { ToastModule } from '@anguless/angulux/toast';
import { TreeTableModule } from '@anguless/angulux/treetable';
import { TreeNode } from '@anguless/angulux/api';

/**
 * Second upstream probe page: the changelog entries of PrimeNG 22.1.1 to 22.1.4 that name a
 * module angulux ships, other than Select (#168).
 *
 * Same rules as section 9 onward of app.ts. Each scenario is written from OUR source and
 * measured in the browser; the only thing taken from upstream is the published sentence that a
 * defect exists. A scenario that does not reproduce stays as a passing test, because it is the
 * only evidence the question was asked.
 *
 * One scenario per `?case=`, so a test builds only what it measures. The table scenarios
 * render thousands of rows, and a timing taken beside thirty other components measures them too.
 */
const CASE = new URLSearchParams(location.search).get('case') ?? '';

/** A day in a fixed month, so a probe never depends on the date the gate happens to run. */
const at = (day: number, hours = 0, minutes = 0): Date => new Date(2026, 2, day, hours, minutes, 0, 0);

/** `YYYY-MM-DD HH:mm` in local time, or `null`. What a probe prints for a date model. */
function stamp(value: unknown): string {
    if (!(value instanceof Date)) return value == null ? 'null' : `not-a-date:${typeof value}`;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/**
 * A modal drawer inside a shadow root. The drawer keeps its default `appendTo`, so its panel
 * stays in this shadow tree while anything it looks up through `document` does not see it.
 */
@Component({
    selector: 'agl-verify-shadow-drawer',
    imports: [DrawerModule],
    encapsulation: ViewEncapsulation.ShadowDom,
    template: `
        <button id="drawer-shadow-open" type="button" (click)="open.set(true)">open the drawer in the shadow root</button>
        <agl-drawer [visible]="open()" (visibleChange)="open.set($event)" header="Shadow drawer">
            <p>inside a shadow root</p>
        </agl-drawer>
    `
})
export class ShadowDrawerHost {
    open = signal(false);
}

interface Row {
    id: number;
    name: string;
}

/** Names that do not sort in id order, so a sort visibly reorders the rows. */
const makeRows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Row ${String((i * 7919) % 1000).padStart(3, '0')}` }));

interface City {
    name: string;
    code: string;
    disabled?: boolean;
}

@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, ReactiveFormsModule, ButtonModule, ConfirmDialogModule, DatePickerModule, DialogModule, DrawerModule, MenuModule, MultiSelectModule, SelectModule, TableModule, ToastModule, TreeTableModule, ShadowDrawerHost],
    providers: [ConfirmationService, MessageService],
    template: `
        <h1>angulux — upstream 22.1.x probes</h1>
        @switch (kase) {
            <!-- DatePicker: does an unselectable day say so to assistive technology? -->
            @case ('dp-aria') {
                <section id="sec-dp-aria">
                    <agl-datepicker [ngModel]="dpAria()" (ngModelChange)="dpAria.set($event)" [minDate]="dpAriaMin" [disabledDays]="[0, 6]" [inline]="true" />
                </section>
            }

            <!-- DatePicker: where focus goes after the keyboard moves to another month. Inline and popup. -->
            @case ('dp-nav') {
                <section id="sec-dp-nav">
                    <div id="dp-nav-inline">
                        <agl-datepicker [ngModel]="dpNavInline()" (ngModelChange)="dpNavInline.set($event)" [inline]="true" />
                    </div>
                    <div id="dp-nav-popup">
                        <agl-datepicker [ngModel]="dpNavPopup()" (ngModelChange)="dpNavPopup.set($event)" inputId="dp-nav-popup-input" />
                    </div>
                </section>
            }

            <!-- DatePicker timeOnly: typing a time must keep the date part of the bound value; and a
                 12-hour clock has no hour 00. -->
            @case ('dp-timeonly') {
                <section id="sec-dp-timeonly">
                    <div id="dp-timeonly-popup">
                        <agl-datepicker [ngModel]="dpTimeOnly()" (ngModelChange)="dpTimeOnly.set($event)" [timeOnly]="true" inputId="dp-timeonly-input" />
                    </div>
                    <div class="probe" id="probe-dp-timeonly">{{ stamp(dpTimeOnly()) }}</div>
                    <div id="dp-timeonly-12">
                        <agl-datepicker [ngModel]="dpTimeOnly12()" (ngModelChange)="dpTimeOnly12.set($event)" [timeOnly]="true" [inline]="true" hourFormat="12" />
                    </div>
                    <div class="probe" id="probe-dp-timeonly-12">{{ stamp(dpTimeOnly12()) }}</div>
                </section>
            }

            <!-- DatePicker hour buttons on a 12-hour clock, each next to a bound it can cross. -->
            @case ('dp-hour') {
                <section id="sec-dp-hour">
                    @for (h of dpHour; track h.id) {
                        <div [id]="'dp-hour-' + h.id">
                            <agl-datepicker [ngModel]="h.value()" (ngModelChange)="h.value.set($event)" [minDate]="h.min" [maxDate]="h.max" [stepHour]="h.step" [showTime]="true" hourFormat="12" [inline]="true" />
                            <div class="probe" [id]="'probe-dp-hour-' + h.id">{{ stamp(h.value()) }}</div>
                        </div>
                    }
                </section>
            }

            <!-- DatePicker in a reactive form: the order in which touched and the value arrive. -->
            @case ('dp-touched') {
                <section id="sec-dp-touched">
                    <agl-datepicker [formControl]="dpTouched" inputId="dp-touched-input" />
                    @if (dpTouchedShowsError()) {
                        <span id="dp-touched-error">required</span>
                    }
                    <div class="probe" id="probe-dp-touched">{{ dpTouchedLog().join(' ') }}</div>
                </section>
            }

            <!-- Drawer: modal, once in the light DOM as the control and once inside a shadow root. -->
            @case ('drawer-shadow') {
                <section id="sec-drawer-shadow">
                    <button id="drawer-light-open" type="button" (click)="drawerLight.set(true)">open the drawer in the light DOM</button>
                    <agl-drawer [visible]="drawerLight()" (visibleChange)="drawerLight.set($event)" header="Light drawer">
                        <p>in the light DOM</p>
                    </agl-drawer>
                    <agl-verify-shadow-drawer id="drawer-shadow-host" />
                </section>
            }

            <!-- Overlay: a panel that is leaving. The leave phase is stretched to 1.5 s so the
                 window can be hit on purpose; how long it lasts does not decide whether it takes
                 pointer events, only how easy it is to land a click in it. -->
            @case ('overlay-closing') {
                <section id="sec-overlay-closing">
                    <agl-select [options]="cities" [ngModel]="overlayValue()" (ngModelChange)="overlayValue.set($event)" optionLabel="name" placeholder="City" [motionOptions]="{ duration: { leave: 1500 } }" />
                    <div class="probe" id="probe-overlay-closing">{{ overlayValue()?.code ?? 'none' }}</div>
                    <div id="overlay-closing-default">
                        <agl-select [options]="cities" [ngModel]="overlayDefault()" (ngModelChange)="overlayDefault.set($event)" optionLabel="name" placeholder="City" />
                        <div class="probe" id="probe-overlay-closing-default">{{ overlayDefault()?.code ?? 'none' }}</div>
                    </div>
                </section>
            }

            <!-- ConfirmDialog icons: set as inputs, and carried by the confirmation. -->
            @case ('confirm-icons') {
                <section id="sec-confirm-icons">
                    <button id="confirm-inputs-open" type="button" (click)="confirmByInputs()">icons as inputs</button>
                    <button id="confirm-object-open" type="button" (click)="confirmByObject()">icons on the confirmation</button>
                    <agl-confirmdialog key="inputs" acceptIcon="pi pi-check" rejectIcon="pi pi-times" />
                    <agl-confirmdialog key="object" />
                </section>
            }

            <!-- Dialog appendTo: an element target, and body as the control. -->
            @case ('dialog-append') {
                <section id="sec-dialog-append">
                    <div id="dialog-append-target" #dialogTarget></div>
                    <button id="dialog-append-open" type="button" (click)="dialogToElement.set(true)">open into the element</button>
                    <button id="dialog-body-open" type="button" (click)="dialogToBody.set(true)">open into body</button>
                    <agl-dialog [visible]="dialogToElement()" (visibleChange)="dialogToElement.set($event)" [appendTo]="dialogTarget" header="Element target" styleClass="dialog-to-element">
                        <p>appended to an element</p>
                    </agl-dialog>
                    <agl-dialog [visible]="dialogToBody()" (visibleChange)="dialogToBody.set($event)" appendTo="body" header="Body target" styleClass="dialog-to-body">
                        <p>appended to body</p>
                    </agl-dialog>
                </section>
            }

            <!-- Toast: three sticky messages; closing them removes them, and a swipe does nothing. -->
            @case ('toast') {
                <section id="sec-toast">
                    <button id="toast-add" type="button" (click)="addToasts()">add three</button>
                    <agl-toast />
                </section>
            }

            <!-- Menu: keyboard navigation with a custom item template, and without one as the control. -->
            @case ('menu-template') {
                <section id="sec-menu-template">
                    <div id="menu-template">
                        <agl-menu [model]="menuItems">
                            <ng-template #item let-item>
                                <span class="custom-item">{{ item.label }}</span>
                            </ng-template>
                        </agl-menu>
                    </div>
                    <div id="menu-plain">
                        <agl-menu [model]="menuItems" />
                    </div>
                    <div class="probe" id="probe-menu-template">{{ menuLog().join(' ') || 'none' }}</div>
                </section>
            }

            <!-- MultiSelect select-all: unbound, bound to a value the app never set, and with a filter typed. -->
            @case ('ms-selectall') {
                <section id="sec-ms-selectall">
                    <div id="ms-plain">
                        <agl-multiselect [options]="cities" [ngModel]="msPlain()" (ngModelChange)="msPlain.set($event)" optionLabel="name" optionValue="code" placeholder="Plain" />
                        <div class="probe" id="probe-ms-plain">{{ msPlain().join(',') || 'empty' }}</div>
                    </div>
                    <div id="ms-unset">
                        <agl-multiselect [options]="cities" [ngModel]="msUnset()" (ngModelChange)="msUnset.set($event)" optionLabel="name" optionValue="code" [selectAll]="msUnsetFlag" placeholder="Unset" />
                        <div class="probe" id="probe-ms-unset">{{ msUnset().join(',') || 'empty' }}</div>
                    </div>
                    <div id="ms-disabled">
                        <agl-multiselect [options]="citiesWithDisabled" [ngModel]="msDisabled()" (ngModelChange)="msDisabled.set($event)" optionLabel="name" optionValue="code" optionDisabled="disabled" placeholder="Disabled" />
                        <div class="probe" id="probe-ms-disabled">{{ msDisabled().join(',') || 'empty' }}</div>
                    </div>
                </section>
            }

            <!-- Table: resetPageOnSort false, without and with a column filter in the header. -->
            @case ('table-sort-page') {
                <section id="sec-table-sort-page">
                    @for (variant of ['plain', 'filtered']; track variant) {
                        <div [id]="'sort-page-' + variant">
                            <agl-table [value]="rows30" [paginator]="true" [rows]="5" [resetPageOnSort]="false" dataKey="id">
                                <ng-template #header>
                                    <tr>
                                        <th aglSortableColumn="name">Name <agl-sortIcon field="name" /></th>
                                        <th>
                                            Id
                                            @if (variant === 'filtered') {
                                                <agl-columnFilter type="text" field="name" display="menu" />
                                            }
                                        </th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-r>
                                    <tr>
                                        <td>{{ r.name }}</td>
                                        <td>{{ r.id }}</td>
                                    </tr>
                                </ng-template>
                            </agl-table>
                        </div>
                    }
                </section>
            }

            <!-- Table: the sort indicator, before any sort and with an initial descending sort. A static
                 sortOrder="-1" does not compile under strictTemplates (the input has no number
                 transform), so only the binding is measured. -->
            @case ('table-sort-icon') {
                <section id="sec-table-sort-icon">
                    <div id="sort-icon-unsorted">
                        <agl-table [value]="rows30">
                            <ng-template #header>
                                <tr>
                                    <th aglSortableColumn="name">Name <agl-sortIcon field="name" /></th>
                                    <th aglSortableColumn="id">Id <agl-sortIcon field="id" /></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-r>
                                <tr>
                                    <td>{{ r.name }}</td>
                                    <td>{{ r.id }}</td>
                                </tr>
                            </ng-template>
                        </agl-table>
                    </div>
                    <div id="sort-icon-binding">
                        <agl-table [value]="rows30" sortField="name" [sortOrder]="-1">
                            <ng-template #header>
                                <tr>
                                    <th aglSortableColumn="name">Name <agl-sortIcon field="name" /></th>
                                    <th aglSortableColumn="id">Id <agl-sortIcon field="id" /></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-r>
                                <tr>
                                    <td>{{ r.name }}</td>
                                    <td>{{ r.id }}</td>
                                </tr>
                            </ng-template>
                        </agl-table>
                    </div>
                </section>
            }

            <!-- Table: the record count after a column filter is applied and then cleared, from the
                 menu's Clear button and by emptying a row filter. -->
            @case ('table-filter-total') {
                <section id="sec-table-filter-total">
                    @for (variant of ['menu', 'row']; track variant) {
                        <div [id]="'filter-total-' + variant">
                            <agl-table #filterTotal [value]="rows20" [paginator]="true" [rows]="5" [showCurrentPageReport]="true" currentPageReportTemplate="total={totalRecords}" dataKey="id">
                                <ng-template #header>
                                    <tr>
                                        <th>Name <agl-columnFilter type="text" field="name" [display]="variant" [showMenu]="variant === 'menu'" /></th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-r>
                                    <tr>
                                        <td>{{ r.name }}</td>
                                    </tr>
                                </ng-template>
                            </agl-table>
                            <div class="probe" [id]="'probe-filter-total-' + variant">{{ filterTotal.totalRecords }}</div>
                        </div>
                    }
                </section>
            }

            <!-- Table: lazy and stateful, with the columns arriving with the first page of data. -->
            @case ('table-lazy-state') {
                <section id="sec-table-lazy-state">
                    @for (variant of ['stateless', 'stateful', 'reorder']; track variant) {
                        <div [id]="'lazy-' + variant">
                            <agl-table
                                [value]="lazyRows()"
                                [columns]="lazyCols()"
                                [lazy]="true"
                                (onLazyLoad)="lazyLoad($event)"
                                [paginator]="true"
                                [rows]="5"
                                [totalRecords]="30"
                                [stateKey]="variant === 'stateless' ? undefined : 'agl-upstream-lazy-' + variant"
                                stateStorage="session"
                                [reorderableColumns]="variant === 'reorder'"
                            >
                                <ng-template #header let-columns>
                                    <tr>
                                        @for (c of columns; track c.field) {
                                            <th>{{ c.header }}</th>
                                        }
                                    </tr>
                                </ng-template>
                                <ng-template #body let-r let-columns="columns">
                                    <tr>
                                        @for (c of columns; track c.field) {
                                            <td>{{ r[c.field] }}</td>
                                        }
                                    </tr>
                                </ng-template>
                            </agl-table>
                        </div>
                    }
                </section>
            }

            <!-- Table: what a scroll of the virtual scroller rebuilds. -->
            @case ('table-virtual') {
                <section id="sec-table-virtual">
                    <agl-table [value]="rows1000" [scrollable]="true" scrollHeight="400px" [virtualScroll]="true" [virtualScrollItemSize]="40" dataKey="id">
                        <ng-template #body let-r>
                            <tr [attr.data-id]="r.id" style="height: 40px">
                                <td>{{ r.id }}</td>
                                <td>{{ r.name }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                </section>
            }

            <!-- Table and TreeTable: render time against row count. The rows are set from the test
                 through window.__aglSetRows, so each size is timed from the same starting point. -->
            @case ('table-perf') {
                <section id="sec-table-perf">
                    <agl-table [value]="perfRows()" dataKey="id">
                        <ng-template #body let-r>
                            <tr>
                                <td>{{ r.id }}</td>
                                <td>{{ r.name }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                </section>
            }
            <!-- The control: the same rows in a native table, so the browser's and Angular's own
                 growth can be told apart from the component's. -->
            @case ('native-perf') {
                <section id="sec-native-perf">
                    <table>
                        <tbody>
                            @for (r of perfRows(); track r) {
                                <tr>
                                    <td>{{ r.id }}</td>
                                    <td>{{ r.name }}</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </section>
            }
            @case ('treetable-perf') {
                <section id="sec-treetable-perf">
                    <agl-treetable [value]="perfNodes()" dataKey="id">
                        <ng-template #body let-rowNode let-rowData="rowData">
                            <tr [ttRow]="rowNode">
                                <td>{{ rowData.id }}</td>
                                <td>{{ rowData.name }}</td>
                            </tr>
                        </ng-template>
                    </agl-treetable>
                </section>
            }

            @default {
                <p id="no-case">no case: {{ kase }}</p>
            }
        }
    `
})
export class Upstream221 {
    readonly kase = CASE;
    readonly stamp = stamp;

    private readonly confirmation = inject(ConfirmationService);
    private readonly messages = inject(MessageService);

    cities: City[] = [
        { name: 'Hanoi', code: 'HN' },
        { name: 'Da Nang', code: 'DN' },
        { name: 'Hue', code: 'HUE' },
        { name: 'Ho Chi Minh City', code: 'HCM' }
    ];

    // ── DatePicker ────────────────────────────────────────────────────────────
    /** Wednesday 18 March 2026. Days before the 10th and every weekend are unselectable. */
    dpAria = signal<Date | null>(at(18));
    dpAriaMin = at(10);

    dpNavInline = signal<Date | null>(at(15));
    dpNavPopup = signal<Date | null>(at(15));

    /** A date far from today, so a time typed into it cannot keep the right day by coincidence. */
    dpTimeOnly = signal<Date | null>(new Date(2020, 0, 15, 10, 0, 0, 0));
    dpTimeOnly12 = signal<Date | null>(null);

    /**
     * Each picker sits next to the bound its scenario crosses, on the same day, so the bound is
     * live (the clamp only runs when the value is on the minimum or maximum date).
     */
    dpHour = [
        { id: 'max', value: signal<Date | null>(at(15, 16)), min: null, max: at(15, 17), step: 1 },
        { id: 'min', value: signal<Date | null>(at(15, 13, 45)), min: at(15, 13, 30), max: null, step: 1 },
        { id: 'step', value: signal<Date | null>(at(15, 13)), min: null, max: null, step: 2 },
        { id: 'noon', value: signal<Date | null>(at(15, 11)), min: null, max: at(15, 11, 30), step: 1 },
        { id: 'plain', value: signal<Date | null>(at(15, 11)), min: null, max: null, step: 1 }
    ];

    dpTouched = new FormControl<Date | null>(null, Validators.required);
    dpTouchedLog = signal<string[]>([]);
    dpTouchedShowsError = signal(false);

    // ── Overlays ──────────────────────────────────────────────────────────────
    drawerLight = signal(false);
    overlayValue = signal<City | null>(null);
    overlayDefault = signal<City | null>(null);
    dialogToElement = signal(false);
    dialogToBody = signal(false);

    // ── Menu, MultiSelect ─────────────────────────────────────────────────────
    menuLog = signal<string[]>([]);
    menuItems: MenuItem[] = [
        { label: 'Save', id: 'menu-save', command: () => this.menuLog.update((l) => [...l, 'save']) },
        { label: 'Export', id: 'menu-export', command: () => this.menuLog.update((l) => [...l, 'export']) },
        { label: 'Delete', id: 'menu-delete', command: () => this.menuLog.update((l) => [...l, 'delete']) }
    ];

    msPlain = signal<string[]>([]);
    msUnset = signal<string[]>([]);
    /** Declared and never assigned, as an app does before it wires onSelectAllChange. */
    msUnsetFlag: boolean | undefined;
    msDisabled = signal<string[]>(['HUE']);
    citiesWithDisabled: City[] = [
        { name: 'Hanoi', code: 'HN' },
        { name: 'Da Nang', code: 'DN' },
        { name: 'Hue', code: 'HUE', disabled: true },
        { name: 'Ho Chi Minh City', code: 'HCM' }
    ];

    // ── Table, TreeTable ──────────────────────────────────────────────────────
    rows30 = makeRows(30);
    rows20 = makeRows(20);
    rows1000 = makeRows(1000);

    lazyRows = signal<Row[]>([]);
    lazyCols = signal<{ field: string; header: string }[] | undefined>(undefined);

    /** A server answering a page: data and columns arrive together, a tick later. */
    lazyLoad(event: TableLazyLoadEvent) {
        setTimeout(() => {
            const first = event.first ?? 0;
            this.lazyCols.set([
                { field: 'id', header: 'Id' },
                { field: 'name', header: 'Name' }
            ]);
            this.lazyRows.set(makeRows(30).slice(first, first + (event.rows ?? 5)));
        });
    }

    perfRows = signal<Row[]>([]);
    perfNodes = signal<TreeNode[]>([]);

    constructor() {
        const w = window as unknown as Record<string, unknown>;
        // Each call sets the rows and runs change detection synchronously, then forces layout, and
        // returns the milliseconds that took. Timing a synchronous tick reads the render itself at
        // full resolution; waiting for frames would round every size to a multiple of 16.7 ms.
        const appRef = inject(ApplicationRef);
        const timed = (apply: () => void): number => {
            const t0 = performance.now();
            apply();
            appRef.tick();
            const t1 = performance.now();
            void document.body.offsetHeight;
            w['__aglLastSplit'] = { script: t1 - t0, layout: performance.now() - t1 };
            return performance.now() - t0;
        };
        w['__aglRenderRows'] = (n: number) => timed(() => this.perfRows.set(makeRows(n)));
        w['__aglRenderNodes'] = (n: number, children = 0) =>
            timed(() =>
                this.perfNodes.set(
                    makeRows(n).map((data) => ({
                        key: String(data.id),
                        data,
                        expanded: children > 0,
                        children: Array.from({ length: children }, (_, c) => ({ key: `${data.id}-${c}`, data: { id: data.id * 1000 + c, name: `${data.name}.${c}` } }))
                    }))
                )
            );

        this.dpTouched.events.subscribe((event) => {
            // Named by instanceof, not constructor.name, which a minified build renames.
            const entry =
                event instanceof TouchedChangeEvent
                    ? `touched:${event.touched}`
                    : event instanceof ValueChangeEvent
                      ? `value:${stamp(event.value)}`
                      : event instanceof StatusChangeEvent
                        ? `status:${event.status}`
                        : null;
            if (entry) this.dpTouchedLog.update((log) => [...log, entry]);
            this.dpTouchedShowsError.set(this.dpTouched.touched && this.dpTouched.invalid);
        });
    }

    confirmByInputs() {
        this.confirmation.confirm({ key: 'inputs', header: 'Inputs', message: 'icons set as inputs' });
    }

    confirmByObject() {
        this.confirmation.confirm({ key: 'object', header: 'Object', message: 'icons on the confirmation', acceptIcon: 'pi pi-check', rejectIcon: 'pi pi-times' });
    }

    addToasts() {
        for (const summary of ['first', 'second', 'third']) {
            this.messages.add({ severity: 'info', summary, detail: summary, sticky: true });
        }
    }
}
