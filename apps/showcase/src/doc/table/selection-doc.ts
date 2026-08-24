import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from '@anguless/angulux/table';

@Component({
    selector: 'agl-table-selection-doc',
    standalone: true,
    imports: [FormsModule, TableModule],
    template: `
        <div class="card">
            <div style="width: 100%">
                <agl-table [value]="products" [(selection)]="selected" dataKey="code" selectionMode="single" [tableStyle]="{ 'min-width': '32rem' }">
                    <ng-template #header>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-product>
                        <tr [aglSelectableRow]="product">
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
export class SelectionDoc {
    products = [
        { code: 'f230fh0g3', name: 'Bamboo Watch', category: 'Accessories', quantity: 24 },
        { code: 'nvklal433', name: 'Black Watch', category: 'Accessories', quantity: 61 },
        { code: 'zz21cz3c1', name: 'Blue Band', category: 'Fitness', quantity: 2 },
        { code: '244wgerg2', name: 'Blue T-Shirt', category: 'Clothing', quantity: 25 },
        { code: 'h456wer53', name: 'Bracelet', category: 'Accessories', quantity: 73 }
    ];

    selected: { code: string; name: string; category: string; quantity: number } | undefined;
}
