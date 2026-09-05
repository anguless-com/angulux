import { Component, signal, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, TreeNode } from '@anguless/angulux/api';
import { ButtonModule, ButtonProps } from '@anguless/angulux/button';
import { CardModule } from '@anguless/angulux/card';
import { DatePickerModule } from '@anguless/angulux/datepicker';
import { DialogModule } from '@anguless/angulux/dialog';
import { MenuModule } from '@anguless/angulux/menu';
import { MultiSelectModule } from '@anguless/angulux/multiselect';
import { ScrollerModule } from '@anguless/angulux/scroller';
import { SelectModule } from '@anguless/angulux/select';
import { TableFilterButtonPropsOptions, TableModule } from '@anguless/angulux/table';
import { TieredMenuModule } from '@anguless/angulux/tieredmenu';
import { TreeTableModule } from '@anguless/angulux/treetable';

interface Product {
    code: string;
    name: string;
    category: string;
    quantity: number;
}

/**
 * Verification app — NOT a showcase.
 *
 * Its only job is to be the substrate for the mandatory browser gate. Each block below
 * corresponds to a module measured to be **at risk from the change-detection strategy
 * change** (it contains decorators that used to rely on the framework default), plus a
 * `facet` block guarding a second defect class found later.
 *
 * Every block exposes a `.probe` element printing the component's **real state**. The gate
 * reads those rather than raw DOM: a correct static render proves nothing here. The question
 * is whether, after a real interaction, state travels back out to the view — which is
 * exactly what breaks under a wrong change-detection strategy, and exactly what neither the
 * build nor the unit suite can see.
 */
/**
 * A shadow-root host, and nothing else.
 *
 * `ViewEncapsulation.ShadowDom` puts this component's view inside a real shadow root, so the
 * button below is separated from `document.head` by a boundary that does not pass style rules
 * through. That boundary is the entire apparatus: no CSS of its own, no inputs, nothing else
 * that could account for a difference against the identical button in the light DOM.
 */
@Component({
    selector: 'agl-verify-shadow',
    imports: [ButtonModule],
    encapsulation: ViewEncapsulation.ShadowDom,
    template: `<agl-button class="shadow-probe" label="shadow DOM" severity="primary" />`
})
export class ShadowHost {}

@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, ButtonModule, ShadowHost, TableModule, TreeTableModule, MenuModule, TieredMenuModule, SelectModule, MultiSelectModule, CardModule, DialogModule, ScrollerModule, DatePickerModule],
    template: `
        <h1>angulux — verification app</h1>

        <!-- ── 1. table (3 risky decorators) ──────────────────────────── -->
        <section id="sec-table">
            <h2>table</h2>
            <agl-table [value]="products" [(selection)]="selectedProduct" dataKey="code" selectionMode="single">
                <ng-template #header>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Quantity</th>
                    </tr>
                </ng-template>
                <ng-template #body let-p>
                    <tr [aglSelectableRow]="p" [attr.data-code]="p.code">
                        <td>{{ p.code }}</td>
                        <td>{{ p.name }}</td>
                        <td>{{ p.quantity }}</td>
                    </tr>
                </ng-template>
            </agl-table>
            <div class="probe" id="probe-table">selection={{ selectedProduct?.code ?? 'none' }}</div>
        </section>

        <!-- ── 2. treetable (5 risky decorators — the worst) ───────────── -->
        <section id="sec-treetable">
            <h2>treetable</h2>
            <agl-treetable [value]="tree" dataKey="key">
                <ng-template #header>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                    </tr>
                </ng-template>
                <ng-template #body let-rowNode let-rowData="rowData">
                    <tr [ttRow]="rowNode" [attr.data-key]="rowData.key">
                        <td>
                            <agl-treeTableToggler [rowNode]="rowNode" />
                            {{ rowData.name }}
                        </td>
                        <td>{{ rowData.type }}</td>
                    </tr>
                </ng-template>
            </agl-treetable>
            <div class="probe" id="probe-treetable">expanded={{ expandedCount() }}</div>
        </section>

        <!-- ── 2b. table advanced — the table's REMAINING 3 risky decorators ──
             agl-columnFilter (which pulls in agl-columnFilterFormElement) and agl-cellEditor.
             Kept separate from the table block above: that one guards row selection, and
             adding a filter to its header would change the selectors of passing scenarios. -->
        <section id="sec-table-adv">
            <h2>table advanced (column filter + cell editor)</h2>
            <agl-table #dtAdv [value]="products" dataKey="code">
                <ng-template #header>
                    <tr>
                        <th>Code</th>
                        <th>
                            Name
                            <agl-columnFilter field="name" type="text" display="row" [showMenu]="false" />
                        </th>
                        <th>Quantity</th>
                    </tr>
                </ng-template>
                <ng-template #body let-p>
                    <tr [attr.data-adv-code]="p.code">
                        <td>{{ p.code }}</td>
                        <td>{{ p.name }}</td>
                        <td [aglEditableColumn]="p" [aglEditableColumnField]="'quantity'" class="qty-cell">
                            <agl-cellEditor>
                                <ng-template #input>
                                    <input class="qty-input" type="number" [(ngModel)]="p.quantity" />
                                </ng-template>
                                <ng-template #output>
                                    <span class="qty-output">{{ p.quantity }}</span>
                                </ng-template>
                            </agl-cellEditor>
                        </td>
                    </tr>
                </ng-template>
            </agl-table>
            <div class="probe" id="probe-table-adv">rows={{ dtAdv.filteredValue?.length ?? products.length }}</div>
        </section>

        <!-- ── 2c. treetable scroll + cell edit — the last 2 risky decorators ──
             [ttScrollableView] is only constructed when scrollable=true; agl-treeTableCellEditor
             only accepts a template via aglTemplate (it has no ContentChild('input') the way
             table's agl-cellEditor does). -->
        <section id="sec-treetable-scroll">
            <h2>treetable scroll + cell editor</h2>
            <agl-treetable [value]="tree2" dataKey="key" [scrollable]="true" scrollHeight="140px">
                <ng-template #header>
                    <tr>
                        <th>Name</th>
                        <th>Note</th>
                    </tr>
                </ng-template>
                <ng-template #body let-rowNode let-rowData="rowData">
                    <tr [ttRow]="rowNode" [attr.data-scroll-key]="rowData.key">
                        <td>{{ rowData.name }}</td>
                        <td [ttEditableColumn]="rowData" [ttEditableColumnField]="'note'" class="note-cell">
                            <agl-treeTableCellEditor>
                                <ng-template #input>
                                    <input class="note-input" type="text" [(ngModel)]="rowData.note" />
                                </ng-template>
                                <ng-template #output>
                                    <span class="note-output">{{ rowData.note }}</span>
                                </ng-template>
                            </agl-treeTableCellEditor>
                        </td>
                    </tr>
                </ng-template>
            </agl-treetable>
            <div class="probe" id="probe-treetable-scroll">note={{ tree2[0].data.note }}</div>
        </section>

        <!-- ── 3. menu ──────────────────────────────────────────────────── -->
        <section id="sec-menu">
            <h2>menu</h2>
            <agl-menu [model]="menuItems" />
            <div class="probe" id="probe-menu">clicked={{ menuClicked() }}</div>
        </section>

        <!-- ── 4. tieredmenu ────────────────────────────────────────────── -->
        <section id="sec-tieredmenu">
            <h2>tieredmenu</h2>
            <agl-tieredmenu [model]="tieredItems" />
            <div class="probe" id="probe-tieredmenu">clicked={{ tieredClicked() }}</div>
        </section>

        <!-- ── 5. select ────────────────────────────────────────────────── -->
        <section id="sec-select">
            <h2>select</h2>
            <agl-select [options]="cities" [(ngModel)]="selectedCity" optionLabel="name" placeholder="Select a city" />
            <div class="probe" id="probe-select">value={{ selectedCity?.code ?? 'none' }}</div>
        </section>

        <!-- ── 6. multiselect ───────────────────────────────────────────── -->
        <section id="sec-multiselect">
            <h2>multiselect</h2>
            <!-- multiselect has migrated to PA-1, so the agl-header facet route is gone and the
                 guard watches the surviving one. The failure it protects against is unchanged —
                 a slot that renders nothing into an overlay, with no error thrown — and the
                 overlay is still the hard part: the header only exists once the panel opens. -->
            <agl-multiselect [options]="cities" [(ngModel)]="selectedCities" optionLabel="name" placeholder="Select several">
                <ng-template #header><div class="ms-facet-header">FACET_HEADER_MULTISELECT</div></ng-template>
            </agl-multiselect>
            <div class="probe" id="probe-multiselect">count={{ selectedCities?.length ?? 0 }}</div>
        </section>

        <!-- ── 7. facet (the layered <ng-content select="…"> edge case) ─── -->
        <section id="sec-facet">
            <h2>facet (card + dialog)</h2>
            <!-- card has migrated to PA-1: the agl-header/agl-footer facet route is gone, so the
                 guard now watches the surviving route. The defect class is unchanged — a slot that
                 silently renders nothing, with no error thrown — only its single entry point moved. -->
            <agl-card>
                <ng-template #header><div class="facet-probe" id="card-header-facet">FACET_HEADER_CARD</div></ng-template>
                <p>Card body content.</p>
                <ng-template #footer><div class="facet-probe" id="card-footer-facet">FACET_FOOTER_CARD</div></ng-template>
            </agl-card>

            <button type="button" id="open-dialog" (click)="dialogVisible.set(true)">Open dialog</button>
            <agl-dialog [(visible)]="dialogVisible" header="Verification dialog" [modal]="true">
                <p>Dialog body.</p>
                <!-- Dialog uses ng-template #footer, NOT the agl-footer facet: the footer slot is
                     gated by *ngIf="_footerTemplate || …", so a facet component projected there
                     would never appear. Verified against upstream — identical there, so this is
                     inherited behaviour rather than a regression introduced by the fork. -->
                <ng-template #footer>
                    <div class="facet-probe" id="dialog-footer-facet">FACET_FOOTER_DIALOG</div>
                </ng-template>
            </agl-dialog>
            <div class="probe" id="probe-dialog">visible={{ dialogVisible() }}</div>
        </section>

        <!-- ── 8. scroller (the last CheckAlways component, and the one the gate could not see) ─── -->
        <section id="sec-scroller">
            <h2>scroller (virtual scroll)</h2>
            <!-- agl-scroller declares ChangeDetectionStrategy.Default, which is the same value as
                 Eager — CheckAlways. It sat outside the guarded set only because the guard matched
                 the token rather than the risk class. It is built here directly rather than through
                 agl-table's [virtualScroll], because the table forwards inputs to the scroller but
                 not its outputs, and a probe reading a value that has travelled
                 scroller -> output -> signal -> view is the whole point of this app. -->
            <agl-scroller [items]="rows" [itemSize]="30" [style]="{ width: '260px', height: '150px' }" (onScrollIndexChange)="scrollFirst.set($event.first)">
                <ng-template #item let-row>
                    <div class="scroller-row" [attr.data-scroller-code]="row.code" style="height: 30px">{{ row.name }}</div>
                </ng-template>
            </agl-scroller>
            <div class="probe" id="probe-scroller">first={{ scrollFirst() }}</div>
        </section>

        <!-- ── 9. UPSTREAM REPRO — datepicker min-time clamp ────────────────────
             Not a change-detection scenario. This block exists to answer ONE question
             raised by upstream's 22.1.0 changelog and triaged follow in
             tools/upstream/seen.json: does the min-time clamp in constrainTime()
             misbehave here the way it is reported to misbehave there?

             The mechanism, read from OUR source (P1 forbids reading theirs):
             datepicker.ts:2733 is a switch (true) branch reading
               isMinDate && !minHoursExceeds12
               && minDate.getHours() - 1 === convertedHour
               && minDate.getHours() > convertedHour
             and its body is returnTimeTriple[0] = 11, hard-coded, plus this.pm = true.

             So with minDate at 09:00 on the selected day, decrementing the hour once
             takes currentHour 9 -> 8, which satisfies (9 - 1 === 8) and (9 > 8), and the
             clamp is supposed to hold the value at the MINIMUM — 09 — but the branch
             assigns 11 instead. Inherited verbatim from 21.1.9. Inline mode is used so
             the gate drives the picker without an overlay. -->
        <section id="sec-up-datepicker">
            <h2>upstream repro — datepicker min-time clamp</h2>
            <agl-datepicker [(ngModel)]="upDate" [minDate]="upMinDate" [inline]="true" [showTime]="true" hourFormat="24" [stepHour]="1"></agl-datepicker>
            <div class="probe" id="probe-up-datepicker">hour={{ upHourText() }}</div>
        </section>

        <!-- ── 10. UPSTREAM REPRO — table totalRecords after a data change ──────
             Upstream 22.1.0, triaged follow in tools/upstream/seen.json (digest
             9f85f9a516a5), whose note says: "Do not close this by reasoning."

             The mechanism, read from OUR source: onChanges() at table.ts:1200 copies the
             totalRecords input into the private _totalRecords ONLY when
             simpleChange.totalRecords.firstChange is true. Every later change to that input
             is therefore dropped. Line 1212 then runs on the value change and assigns
             this.totalRecords = _totalRecords whenever _totalRecords is non-zero — which
             OVERWRITES the value Angular had just written into the input.

             So an app that declares a row count and then changes its data keeps the FIRST
             count forever. With rows=2, five records paginate into three pages and two
             records into one; the page buttons are the user-visible consequence. -->
        <section id="sec-up-table-total">
            <h2>upstream repro — table totalRecords after a data change</h2>
            <button id="up-total-shrink" type="button" (click)="upShrink()">shrink to 2</button>
            <agl-table [value]="upTotRows()" [totalRecords]="upTotCount()" [paginator]="true" [rows]="2">
                <ng-template #body let-p>
                    <tr [attr.data-tot-code]="p.code">
                        <td>{{ p.code }}</td>
                    </tr>
                </ng-template>
            </agl-table>
            <div class="probe" id="probe-up-table-total">rows={{ upTotRows().length }} declared={{ upTotCount() }}</div>
        </section>

        <!-- ── 11. UPSTREAM REPRO — clear() and the column filter input ─────────
             Upstream 22.1.0, digest d9c2f7aacdad.

             The mechanism: clear() at table.ts:2199 delegates to clearFilterValues(), which
             walks this.filters and assigns filter.value = null IN PLACE (table.ts:2213-2223).
             The constraint object stays registered, so hasFilter() at :2168 — which only
             asks whether this.filters has any key at all — keeps returning true.

             Two consequences worth measuring, and they are different questions:
               (a) do the rows come back, and
               (b) does the text the user typed disappear from the input.
             (b) is the one at risk: nothing hands the filter component a NEW reference. -->
        <section id="sec-up-table-filter">
            <h2>upstream repro — clear() and the column filter input</h2>
            <button id="up-filter-clear" type="button" (click)="upFilterTable.clear()">clear()</button>
            <agl-table #upFilterTable [value]="products" dataKey="code">
                <ng-template #header>
                    <tr>
                        <th>
                            Name
                            <agl-columnFilter field="name" type="text" display="row" [showMenu]="false" />
                        </th>
                    </tr>
                </ng-template>
                <ng-template #body let-p>
                    <tr [attr.data-upfilter-code]="p.code">
                        <td>{{ p.name }}</td>
                    </tr>
                </ng-template>
            </agl-table>
            <div class="probe" id="probe-up-table-filter">rows={{ upFilterTable.filteredValue?.length ?? products.length }} hasFilter={{ upFilterTable.hasFilter() }}</div>
        </section>

        <!-- ── 12. UPSTREAM REPRO — frozen column stacking ──────────────────────
             Upstream 22.1.0, digest 0c9d548f166c. seen.json: "z-index/stacking, not
             judgeable from source. Needs the browser gate."

             It is not judgeable from source because the library contributes no z-index for
             this: aglFrozenColumn only sets position/left through cx("frozenColumn"), and
             the stacking order comes from the theme CSS. Geometry is the only evidence,
             so the test scrolls sideways and asks the BROWSER which element is on top at a
             point over the frozen column. -->
        <section id="sec-up-table-frozen">
            <h2>upstream repro — frozen column stacking</h2>
            <agl-table [value]="products" [scrollable]="true" scrollHeight="140px" [tableStyle]="{ 'min-width': '640px' }" [style]="{ width: '260px' }">
                <ng-template #header>
                    <tr>
                        <th aglFrozenColumn style="width: 120px">Code</th>
                        <th style="width: 260px">Name</th>
                        <th style="width: 260px">Category</th>
                    </tr>
                </ng-template>
                <ng-template #body let-p>
                    <tr>
                        <td aglFrozenColumn style="width: 120px" class="frozen-cell" [attr.data-frozen-code]="p.code">{{ p.code }}</td>
                        <td style="width: 260px" class="scrolled-cell">{{ p.name }}</td>
                        <td style="width: 260px" class="scrolled-cell">{{ p.category }}</td>
                    </tr>
                </ng-template>
            </agl-table>
        </section>

        <!-- ── 13. UPSTREAM REPRO — outlined carried by buttonProps ─────────────
             Upstream 22.1.0, digest 3ae212c58d45: the column filter clear button ignores
             the outlined property of filterButtonProps.

             seen.json recorded this REPRODUCES with a claim WIDER than upstream made:
             "button.ts never reads buttonProps?.outlined ... so outlined is ignored on
             EVERY agl-button". It is the only one of the five entries closed by reading
             source instead of by measuring, and reading the source again disagrees with
             it: buttonstyle.ts:17 does read instance.buttonProps?.outlined into the
             p-button-outlined class, and the theme selects on that class and nothing else
             (angulux-styles/src/button/index.ts:314; the string data-p never appears in
             that stylesheet). What omits buttonProps is button.ts:864, the dataP getter,
             whose attribute no rule styles.

             So the wide claim and the narrow one are separated and measured apart:
               (a) props-only  buttonProps.outlined with no [outlined] binding. If this
                               renders outlined, the WIDE claim is false.
               (b) cannot-off  [outlined]="true" plus buttonProps.outlined false, the shape
                               table.ts:5394 hard-codes. classes.root starts with
                               instance.outlined || ..., so the override may be unreachable.
               (c) plain       control. Without it, an absent class proves nothing, because
                               a class that never appears anywhere is not evidence. -->
        <section id="sec-up-button-outlined">
            <h2>upstream repro — outlined carried by buttonProps</h2>
            <agl-button id="up-btn-props-only" label="props only" [buttonProps]="upOutlinedOn" />
            <agl-button id="up-btn-cannot-off" label="cannot turn off" [outlined]="true" [buttonProps]="upOutlinedOff" />
            <agl-button id="up-btn-plain" label="plain" />
        </section>

        <!-- ── 14. UPSTREAM REPRO — the real clear button upstream named ────────
             Section 13 models the markup; this one is the markup. agl-columnFilter in menu
             display renders the popover whose clear button carries the hard-coded
             [outlined]="true" at table.ts:5394 alongside
             [buttonProps]="filterButtonProps?.popover?.clear" at :5398.

             upClearProps below is the shipped default with one value changed: outlined
             false. Everything else is left at the default so that whatever this measures
             is about outlined and not about a half-built props object. -->
        <section id="sec-up-table-clearbtn">
            <h2>upstream repro — filterButtonProps.popover.clear.outlined</h2>
            <agl-table [value]="products" dataKey="code">
                <ng-template #header>
                    <tr>
                        <th>
                            Name
                            <agl-columnFilter field="name" type="text" display="menu" [filterButtonProps]="upClearProps" />
                        </th>
                    </tr>
                </ng-template>
                <ng-template #body let-p>
                    <tr [attr.data-clearbtn-code]="p.code">
                        <td>{{ p.name }}</td>
                    </tr>
                </ng-template>
            </agl-table>
        </section>

        <!-- ── 15. UPSTREAM REPRO — styles inside a shadow root ─────────────────
             Upstream 22.1.0 Core: styles are not applied inside Shadow DOM. Triaged
             cross-cutting in seen.json and never measured, because a framework-level
             sentence names no module to point a test at.

             It points at something real here. usestyle.ts:25 resolves the insertion point
             as this.document.head and appends there; nothing in the tree calls
             getRootNode(), and there is no option to nominate another container. A shadow
             root does not inherit rules from document.head, so a component rendered inside
             one would receive no theme.

             Measured as a DIFFERENCE, not as an absolute. Asserting a specific colour would
             pin the test to the theme; asserting only the shadow side would pass if the
             theme were broken everywhere. The same agl-button is therefore rendered twice —
             once in the light DOM, once inside ViewEncapsulation.ShadowDom — and the gate
             compares the two computed backgrounds. background-color is chosen because it is
             NOT an inherited property: custom properties cross the shadow boundary and would
             mask the failure, but the rule that consumes them cannot. -->
        <section id="sec-up-shadow">
            <h2>upstream repro — styles inside a shadow root</h2>
            <agl-button id="up-shadow-light" label="light DOM" severity="primary" />
            <agl-verify-shadow id="up-shadow-host" />
        </section>
    `
})
export class AppComponent {
    products: Product[] = [
        { code: 'P-001', name: 'Mechanical Keyboard', category: 'Accessories', quantity: 12 },
        { code: 'P-002', name: 'Wireless Mouse', category: 'Accessories', quantity: 30 },
        { code: 'P-003', name: 'Monitor 27"', category: 'Devices', quantity: 5 }
    ];
    selectedProduct: Product | null = null;

    /** Enough rows that the scroller windows them: 150px of viewport over 30px items shows five,
        so the rows the scenario scrolls to have never been rendered before it scrolls. */
    rows = Array.from({ length: 200 }, (_, i) => ({ code: `R-${String(i).padStart(3, '0')}`, name: `Row ${i}` }));

    scrollFirst = signal(0);

    tree: TreeNode[] = [
        {
            key: 'root',
            data: { key: 'root', name: 'Warehouse', type: 'Folder' },
            children: [
                { key: 'child-a', data: { key: 'child-a', name: 'Accessories', type: 'Folder' } },
                { key: 'child-b', data: { key: 'child-b', name: 'Devices', type: 'Folder' } }
            ]
        }
    ];

    /** A separate tree for the scroll block — deliberately not sharing `tree`, so this
        scenario cannot perturb the expand/collapse state the treetable scenario asserts on. */
    tree2: TreeNode[] = [
        { key: 'n1', data: { key: 'n1', name: 'Bin A', note: 'NOTE_ORIGINAL' } },
        { key: 'n2', data: { key: 'n2', name: 'Bin B', note: 'note B' } },
        { key: 'n3', data: { key: 'n3', name: 'Bin C', note: 'note C' } },
        { key: 'n4', data: { key: 'n4', name: 'Bin D', note: 'note D' } }
    ];

    /** Upstream repro — datepicker min-time clamp. Both dates are the SAME day at 09:00,
     *  which is what makes isMinDate true inside constrainTime(). */
    upMinDate = ((d = new Date()) => (d.setHours(9, 0, 0, 0), d))();
    upDate = ((d = new Date()) => (d.setHours(9, 0, 0, 0), d))();

    /** Reads the hour straight off the rendered picker, so the probe reports what a user sees. */
    upHourText = signal('unread');

    /** Upstream repro — totalRecords staleness. Five rows declared as five, then both
     *  shrunk to two in one click, which is what an app does when it refetches. */
    upTotRows = signal<Product[]>([
        { code: 'T-1', name: 'One', category: 'C', quantity: 1 },
        { code: 'T-2', name: 'Two', category: 'C', quantity: 2 },
        { code: 'T-3', name: 'Three', category: 'C', quantity: 3 },
        { code: 'T-4', name: 'Four', category: 'C', quantity: 4 },
        { code: 'T-5', name: 'Five', category: 'C', quantity: 5 }
    ]);
    upTotCount = signal(5);

    upShrink() {
        this.upTotRows.set(this.upTotRows().slice(0, 2));
        this.upTotCount.set(2);
    }

    /** Upstream repro — outlined carried by buttonProps. Bound to FIELDS rather than to
     *  object literals in the template: a literal is a fresh reference on every check, which
     *  would quietly turn the scenario into a test about identity churn. */
    upOutlinedOn: ButtonProps = { outlined: true };
    upOutlinedOff: ButtonProps = { outlined: false };

    /** The shipped default of ColumnFilter.filterButtonProps (table.ts:5597) with exactly one
     *  value changed — popover.clear.outlined — so what section 14 measures is that value and
     *  not a half-built props object. Every key of the interface is required. */
    upClearProps: TableFilterButtonPropsOptions = {
        filter: { severity: 'secondary', text: true, rounded: true },
        inline: { clear: { severity: 'secondary', text: true, rounded: true } },
        popover: {
            addRule: { severity: 'info', text: true, size: 'small' },
            removeRule: { severity: 'danger', text: true, size: 'small' },
            apply: { size: 'small' },
            clear: { outlined: false, size: 'small' }
        }
    };

    menuClicked = signal('none');
    tieredClicked = signal('none');
    dialogVisible = signal(false);

    menuItems: MenuItem[] = [
        { label: 'Save', id: 'menu-save', command: () => this.menuClicked.set('save') },
        { label: 'Delete', id: 'menu-delete', command: () => this.menuClicked.set('delete') }
    ];

    tieredItems: MenuItem[] = [
        {
            label: 'File',
            id: 'tiered-file',
            items: [{ label: 'New', id: 'tiered-new', command: () => this.tieredClicked.set('new') }]
        },
        { label: 'Help', id: 'tiered-help', command: () => this.tieredClicked.set('help') }
    ];

    cities = [
        { name: 'Hanoi', code: 'HN' },
        { name: 'Da Nang', code: 'DN' },
        { name: 'Ho Chi Minh City', code: 'HCM' }
    ];
    selectedCity: { name: string; code: string } | null = null;
    selectedCities: { name: string; code: string }[] = [];

    /** Count expanded nodes — read straight from the data, so it reflects the treetable's real state. */
    expandedCount = signal(0);

    constructor() {
        // `expanded` is written back onto the TreeNode by treetable; polled with a light loop
        // so the probe always tells the truth without reaching into component internals.
        setInterval(() => {
            const n = this.tree.filter((t) => t.expanded).length;
            if (n !== this.expandedCount()) this.expandedCount.set(n);

            // The hour is rendered as text by the library's own template; reading it back
            // rather than reading component internals keeps the probe honest about what a
            // user would see.
            const el = document.querySelector('#sec-up-datepicker .p-datepicker-hour-picker span');
            const t = el ? (el.textContent ?? '').trim() : 'unread';
            if (t !== this.upHourText()) this.upHourText.set(t);
        }, 100);
    }
}
