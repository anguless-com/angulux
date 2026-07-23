import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, SharedModule, TreeNode } from '@anguless/angulux/api';
import { CardModule } from '@anguless/angulux/card';
import { DialogModule } from '@anguless/angulux/dialog';
import { MenuModule } from '@anguless/angulux/menu';
import { MultiSelectModule } from '@anguless/angulux/multiselect';
import { SelectModule } from '@anguless/angulux/select';
import { TableModule } from '@anguless/angulux/table';
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
@Component({
    selector: 'agl-verify-root',
    standalone: true,
    imports: [FormsModule, SharedModule, TableModule, TreeTableModule, MenuModule, TieredMenuModule, SelectModule, MultiSelectModule, CardModule, DialogModule],
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
                                <ng-template aglTemplate="input">
                                    <input class="note-input" type="text" [(ngModel)]="rowData.note" />
                                </ng-template>
                                <ng-template aglTemplate="output">
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
            <!-- Uses the agl-header facet, NOT ng-template #header: only a facet travels through
                 ng-content select="agl-header", which is the path that broke silently before the
                 fix. Going via the template route would exercise none of that fix. -->
            <agl-multiselect [options]="cities" [(ngModel)]="selectedCities" optionLabel="name" placeholder="Select several">
                <agl-header><div class="ms-facet-header">FACET_HEADER_MULTISELECT</div></agl-header>
            </agl-multiselect>
            <div class="probe" id="probe-multiselect">count={{ selectedCities?.length ?? 0 }}</div>
        </section>

        <!-- ── 7. facet: canh lop loi <ng-content select="…"> vua va ───── -->
        <section id="sec-facet">
            <h2>facet (card + dialog)</h2>
            <agl-card>
                <agl-header><div class="facet-probe" id="card-header-facet">FACET_HEADER_CARD</div></agl-header>
                <p>Card body content.</p>
                <agl-footer><div class="facet-probe" id="card-footer-facet">FACET_FOOTER_CARD</div></agl-footer>
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
    `
})
export class AppComponent {
    products: Product[] = [
        { code: 'P-001', name: 'Mechanical Keyboard', category: 'Accessories', quantity: 12 },
        { code: 'P-002', name: 'Wireless Mouse', category: 'Accessories', quantity: 30 },
        { code: 'P-003', name: 'Monitor 27"', category: 'Devices', quantity: 5 }
    ];
    selectedProduct: Product | null = null;

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
        }, 100);
    }
}
