import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from '@anguless/angulux/button';
import { CheckboxModule } from '@anguless/angulux/checkbox';
import { DatePickerModule } from '@anguless/angulux/datepicker';
import { DialogModule } from '@anguless/angulux/dialog';
import { InputTextModule } from '@anguless/angulux/inputtext';
import { MultiSelectModule } from '@anguless/angulux/multiselect';
import { SelectModule } from '@anguless/angulux/select';
import { TableModule } from '@anguless/angulux/table';
import { TooltipModule } from '@anguless/angulux/tooltip';

/**
 * What the library costs while an application runs: the scenes `tools/measure-speed.mjs` times.
 *
 * One scene per `?scene=`, so a page holds only what its measurement needs; `?n=` sets how many
 * rows, options or controls it builds. Nothing is on screen until `#show` is clicked, so
 * building the scene is itself a measurement. Every control the tool drives has a fixed id.
 *
 * The scenes are the things an admin screen does all day: a table of a thousand rows that is
 * shown, sorted, filtered and clicked; the same table with a checkbox per row; a paged and a
 * virtual one; a select and a multiselect over a thousand options; a dialog; a date picker; and
 * a screen of plain controls. `#other` is an input that has nothing to do with the scene: typing
 * into it measures what the scene costs when nothing in it changed.
 */
interface Row {
    id: number;
    name: string;
    code: string;
    city: string;
    country: string;
    status: string;
    amount: number;
    date: string;
    note: string;
}

const CITIES = ['Hanoi', 'Da Nang', 'Hue', 'Ho Chi Minh City', 'Can Tho', 'Hai Phong', 'Nha Trang', 'Da Lat'];
const STATUSES = ['new', 'open', 'held', 'closed'];

function makeRows(count: number): Row[] {
    const rows: Row[] = [];
    for (let i = 0; i < count; i += 1) {
        // A fixed scramble, so the rows are not already in the order a sort would give them.
        const k = (i * 7919) % count;
        rows.push({
            id: i,
            name: `Name ${String(k).padStart(5, '0')}`,
            code: `C-${(k * 31) % 9973}`,
            city: CITIES[k % CITIES.length],
            country: 'Vietnam',
            status: STATUSES[k % STATUSES.length],
            amount: (k * 104729) % 100000,
            date: `2026-${String((k % 12) + 1).padStart(2, '0')}-${String((k % 28) + 1).padStart(2, '0')}`,
            note: `Note for row ${k}`
        });
    }
    return rows;
}

@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, TableModule, SelectModule, MultiSelectModule, DialogModule, DatePickerModule, ButtonModule, CheckboxModule, InputTextModule, TooltipModule],
    template: `
        <h1>angulux — speed: {{ scene }}</h1>
        <p>
            <button id="show" type="button" (click)="show()">show</button>
            <button id="hide" type="button" (click)="hide()">hide</button>
            <input id="other" aria-label="Unrelated" (input)="typed.set($any($event.target).value)" />
            <span id="typed">{{ typed() }}</span>
        </p>

        @switch (scene) {
            @case ('table') {
                @if (shown()) {
                    <input id="search" aria-label="Search" (input)="table.filterGlobal($any($event.target).value, 'contains')" />
                    <agl-table #table [value]="rows" dataKey="id" selectionMode="single" [(selection)]="selected" [globalFilterFields]="['name', 'city']" [filterDelay]="0">
                        <ng-template #header>
                            <tr>
                                <th id="sort-name" aglSortableColumn="name">Name <agl-sortIcon field="name" /></th>
                                <th aglSortableColumn="code">Code <agl-sortIcon field="code" /></th>
                                <th>City</th>
                                <th>Country</th>
                                <th>Status</th>
                                <th id="sort-amount" aglSortableColumn="amount">Amount <agl-sortIcon field="amount" /></th>
                                <th>Date</th>
                                <th>Note</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr [aglSelectableRow]="row">
                                <td>{{ row.name }}</td>
                                <td>{{ row.code }}</td>
                                <td>{{ row.city }}</td>
                                <td>{{ row.country }}</td>
                                <td>{{ row.status }}</td>
                                <td>{{ row.amount }}</td>
                                <td>{{ row.date }}</td>
                                <td>{{ row.note }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                }
            }
            @case ('table-checkbox') {
                @if (shown()) {
                    <agl-table [value]="rows" dataKey="id" [(selection)]="picked">
                        <ng-template #header>
                            <tr>
                                <th><agl-tableHeaderCheckbox inputId="all" /></th>
                                <th>Name</th>
                                <th>Code</th>
                                <th>City</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td><agl-tableCheckbox [value]="row" /></td>
                                <td>{{ row.name }}</td>
                                <td>{{ row.code }}</td>
                                <td>{{ row.city }}</td>
                                <td>{{ row.status }}</td>
                                <td>{{ row.amount }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                }
            }
            @case ('table-paged') {
                @if (shown()) {
                    <agl-table [value]="rows" dataKey="id" [paginator]="true" [rows]="100" [rowsPerPageOptions]="[50, 100, 200]">
                        <ng-template #header>
                            <tr>
                                <th id="sort-name" aglSortableColumn="name">Name <agl-sortIcon field="name" /></th>
                                <th>Code</th>
                                <th>City</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td>{{ row.name }}</td>
                                <td>{{ row.code }}</td>
                                <td>{{ row.city }}</td>
                                <td>{{ row.status }}</td>
                                <td>{{ row.amount }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                }
            }
            @case ('table-virtual') {
                @if (shown()) {
                    <agl-table [value]="rows" dataKey="id" [scrollable]="true" scrollHeight="480px" [virtualScroll]="true" [virtualScrollItemSize]="46">
                        <ng-template #header>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>City</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr style="height: 46px">
                                <td>{{ row.name }}</td>
                                <td>{{ row.code }}</td>
                                <td>{{ row.city }}</td>
                                <td>{{ row.status }}</td>
                                <td>{{ row.amount }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                }
            }
            @case ('select') {
                @if (shown()) {
                    <agl-select id="select" [options]="rows" optionLabel="name" optionValue="id" [(ngModel)]="one" [filter]="true" placeholder="Pick one" />
                }
            }
            @case ('multiselect') {
                @if (shown()) {
                    <agl-multiselect id="multiselect" [options]="rows" optionLabel="name" optionValue="id" [(ngModel)]="many" placeholder="Pick some" />
                }
            }
            @case ('dialog') {
                <agl-dialog header="A dialog" [(visible)]="open" [modal]="true" [style]="{ width: '30rem' }">
                    <p>Twelve fields, the size of an ordinary edit form.</p>
                    @for (field of fields; track field) {
                        <p><input aglInputText [attr.aria-label]="'Field ' + field" /></p>
                    }
                    <agl-button label="Close" (onClick)="open = false" />
                </agl-dialog>
            }
            @case ('datepicker') {
                @if (shown()) {
                    <agl-datepicker id="datepicker" [(ngModel)]="date" [showIcon]="true" />
                }
            }
            @case ('buttons') {
                @if (shown()) {
                    @for (row of rows; track row.id) {
                        <agl-button [label]="row.code" />
                    }
                }
            }
            @case ('controls') {
                @if (shown()) {
                    @for (row of rows; track row.id) {
                        <span>
                            <input aglInputText [attr.aria-label]="row.name" [aglTooltip]="row.note" />
                            <agl-checkbox [binary]="true" [ariaLabel]="row.name" />
                        </span>
                    }
                }
            }
        }
    `
})
export class Speed {
    private readonly query = new URLSearchParams(location.search);
    readonly scene = this.query.get('scene') ?? 'table';
    readonly rows = makeRows(Number(this.query.get('n') ?? 1000));
    readonly fields = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    readonly shown = signal(false);
    readonly typed = signal('');

    selected: Row | null = null;
    picked: Row[] = [];
    one: number | null = null;
    many: number[] = [];
    date: Date | null = null;
    open = false;

    show(): void {
        this.shown.set(true);
        this.open = true;
    }

    hide(): void {
        this.shown.set(false);
        this.open = false;
    }
}
