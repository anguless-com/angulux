import { Component } from '@angular/core';
import { TableModule } from '@anguless/angulux/table';

@Component({
    selector: 'agl-table-basic-doc',
    imports: [TableModule],
    template: `
        <div class="card">
            <agl-table [value]="products" [tableStyle]="{ 'min-width': '32rem' }">
                <ng-template #header>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Quantity</th>
                    </tr>
                </ng-template>
                <ng-template #body let-product>
                    <tr>
                        <td>{{ product.code }}</td>
                        <td>{{ product.name }}</td>
                        <td>{{ product.category }}</td>
                        <td>{{ product.quantity }}</td>
                    </tr>
                </ng-template>
            </agl-table>
        </div>
    `
})
export class BasicDoc {
    products = [
        { code: 'f230fh0g3', name: 'Bamboo Watch', category: 'Accessories', quantity: 24 },
        { code: 'nvklal433', name: 'Black Watch', category: 'Accessories', quantity: 61 },
        { code: 'zz21cz3c1', name: 'Blue Band', category: 'Fitness', quantity: 2 },
        { code: '244wgerg2', name: 'Blue T-Shirt', category: 'Clothing', quantity: 25 },
        { code: 'h456wer53', name: 'Bracelet', category: 'Accessories', quantity: 73 }
    ];
}
