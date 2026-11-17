import { Component } from '@angular/core';
import { TableModule } from '@anguless/angulux/table';

/**
 * The line above a selected row, in every Table layout the stylesheet treats apart. (TreeTable does
 * not load the angulux-styles sheet that carried the same rule; its own stylesheet never had it.)
 *
 * Until 2026-11-18 that line was drawn by `tr:has(+ .p-datatable-row-selected) > td`, which recolours the
 * bottom border of the row BEFORE a selected one. Chrome re-evaluates such a sibling `:has()` for
 * every row inserted beside it, so rendering a long table grew with the square of its rows (#168,
 * 22.1.3). e2e/table-selected-edge.spec.ts renders each scene below twice, once with that rule and
 * once with its replacement, and requires the two screenshots to be identical, byte for byte, in
 * every preset, colour scheme and device pixel ratio it tries.
 *
 * main.ts bootstraps this page with the preset named by `?preset=` (aura, lara, nora, material).
 */
interface Row {
    id: string;
    name: string;
    code: string;
    city: string;
}

const ROWS: Row[] = ['Hanoi', 'Da Nang', 'Hue', 'Ho Chi Minh City', 'Can Tho', 'Hai Phong'].map((city, i) => ({ id: `r${i}`, name: `Name ${i}`, code: `C${i}`, city }));

const pick = (...indexes: number[]): Row[] => indexes.map((i) => ROWS[i]);

@Component({
    selector: 'agl-verify-root',
    imports: [TableModule],
    styles: [
        `
            .scene {
                margin: 1.5rem;
                width: 40rem;
            }
        `
    ],
    template: `
        <h1>angulux — the line above a selected row</h1>
        <section id="sec-table-edge">
            @for (scene of tableScenes; track scene.id) {
                <div class="scene" [id]="scene.id">
                    <agl-table
                        [value]="rows"
                        selectionMode="multiple"
                        [selection]="scene.selection"
                        dataKey="id"
                        [showGridlines]="scene.gridlines"
                        [stripedRows]="scene.striped"
                        [size]="scene.size"
                        [rowHover]="true"
                    >
                        @if (scene.header) {
                            <ng-template #header>
                                <tr>
                                    <th>Name</th>
                                    <th>Code</th>
                                    <th>City</th>
                                </tr>
                            </ng-template>
                        }
                        <ng-template #body let-row let-i="rowIndex">
                            <tr [aglSelectableRow]="row" [aglSelectableRowIndex]="i">
                                <td>{{ row.name }}</td>
                                <td>{{ row.code }}</td>
                                <td>{{ row.city }}</td>
                            </tr>
                        </ng-template>
                    </agl-table>
                </div>
            }

            <!-- Frozen first column in a scrollable table: its cells are positioned (sticky). -->
            <div class="scene" id="d-frozen">
                <agl-table [value]="rows" selectionMode="multiple" [selection]="frozenSelection" dataKey="id" [scrollable]="true" scrollHeight="400px" [tableStyle]="{ 'min-width': '60rem' }">
                    <ng-template #header>
                        <tr>
                            <th aglFrozenColumn>Name</th>
                            <th>Code</th>
                            <th>City</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-row let-i="rowIndex">
                        <tr [aglSelectableRow]="row" [aglSelectableRowIndex]="i">
                            <td aglFrozenColumn>{{ row.name }}</td>
                            <td>{{ row.code }}</td>
                            <td>{{ row.city }}</td>
                        </tr>
                    </ng-template>
                </agl-table>
            </div>

            <!-- A table inside a table of the other kind: each must follow its own mode. -->
            @for (outer of nested; track outer.id) {
                <div class="scene" [id]="outer.id">
                    <agl-table [value]="rows.slice(0, 3)" dataKey="id" [expandedRowKeys]="{ r1: true }" [showGridlines]="outer.outerGridlines" selectionMode="multiple" [selection]="nestedOuterSelection">
                        <ng-template #body let-row let-i="rowIndex">
                            <tr [aglSelectableRow]="row" [aglSelectableRowIndex]="i">
                                <td>{{ row.name }}</td>
                                <td>{{ row.city }}</td>
                            </tr>
                        </ng-template>
                        <ng-template #expandedrow let-row>
                            <tr>
                                <td colspan="2">
                                    <agl-table [value]="rows.slice(0, 4)" dataKey="id" [showGridlines]="!outer.outerGridlines" selectionMode="multiple" [selection]="nestedInnerSelection">
                                        <ng-template #header>
                                            <tr>
                                                <th>Name</th>
                                                <th>Code</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template #body let-inner let-j="rowIndex">
                                            <tr [aglSelectableRow]="inner" [aglSelectableRowIndex]="j">
                                                <td>{{ inner.name }}</td>
                                                <td>{{ inner.code }}</td>
                                            </tr>
                                        </ng-template>
                                    </agl-table>
                                </td>
                            </tr>
                        </ng-template>
                    </agl-table>
                </div>
            }

        </section>
    `
})
export class TableEdge {
    readonly rows = ROWS;

    readonly tableScenes = [
        { id: 'd-default', selection: pick(1, 3, 4), gridlines: false, striped: false, size: undefined, header: true },
        { id: 'd-default-ends', selection: pick(0, 5), gridlines: false, striped: false, size: undefined, header: true },
        { id: 'd-gridlines', selection: pick(1, 3, 4), gridlines: true, striped: false, size: undefined, header: true },
        { id: 'd-gridlines-ends', selection: pick(0, 5), gridlines: true, striped: false, size: undefined, header: true },
        { id: 'd-gridlines-noheader', selection: pick(1, 3, 4), gridlines: true, striped: false, size: undefined, header: false },
        { id: 'd-striped-small', selection: pick(2), gridlines: false, striped: true, size: 'small' as const, header: true },
        { id: 'd-large-noheader', selection: pick(2, 3), gridlines: false, striped: false, size: 'large' as const, header: false },
        { id: 'd-hover', selection: pick(2), gridlines: false, striped: false, size: undefined, header: true },
        { id: 'd-focus', selection: pick(2), gridlines: false, striped: false, size: undefined, header: true },
        { id: 'd-drop-top', selection: pick(2, 4), gridlines: false, striped: false, size: undefined, header: true },
        { id: 'd-drop-bottom', selection: pick(2, 4), gridlines: false, striped: false, size: undefined, header: true },
        { id: 'd-drop-before', selection: pick(2, 4), gridlines: false, striped: false, size: undefined, header: true },
        { id: 'd-none', selection: [] as Row[], gridlines: false, striped: false, size: undefined, header: true }
    ];

    readonly frozenSelection = pick(1, 3);

    readonly nested = [
        { id: 'd-nested-in-plain', outerGridlines: false },
        { id: 'd-nested-in-gridlines', outerGridlines: true }
    ];
    readonly nestedOuterSelection = pick(2);
    readonly nestedInnerSelection = pick(1, 2);
}
