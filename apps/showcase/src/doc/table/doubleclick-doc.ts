import { Component } from '@angular/core';
import { TableModule } from '@anguless/angulux/table';

@Component({
    selector: 'agl-table-doubleclick-doc',
    imports: [TableModule],
    template: `
        <div class="card card-block">
            <div style="width: 100%">
                <agl-table [value]="products" [(selection)]="selected" dataKey="code" selectionMode="single" [tableStyle]="{ 'min-width': '32rem' }">
                    <ng-template #header>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-product let-rowIndex="rowIndex">
                        <tr [aglSelectableRowDblClick]="product" [aglSelectableRowIndex]="rowIndex">
                            <td>{{ product.name }}</td>
                            <td>{{ product.category }}</td>
                        </tr>
                    </ng-template>
                </agl-table>
                <p>Selected: {{ selected?.name ?? 'none' }}</p>
            </div>
        </div>
    `
})
export class DoubleClickDoc {
    products = [
        { code: 'f230fh0g3', name: 'Bamboo Watch', category: 'Accessories' },
        { code: 'nvklal433', name: 'Black Watch', category: 'Accessories' },
        { code: 'zz21cz3c1', name: 'Blue Band', category: 'Fitness' },
        { code: '244wgerg2', name: 'Blue T-Shirt', category: 'Clothing' },
        { code: 'h456wer53', name: 'Bracelet', category: 'Accessories' }
    ];

    selected: { code: string; name: string; category: string } | undefined;
}
