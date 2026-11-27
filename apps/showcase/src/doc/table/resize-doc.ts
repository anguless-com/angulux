import { Component } from '@angular/core';
import { TableModule } from '@anguless/angulux/table';

@Component({
    selector: 'agl-table-resize-doc',
    imports: [TableModule],
    template: `
        <div class="card card-block">
            <agl-table [value]="products" [resizableColumns]="true" [tableStyle]="{ 'min-width': '32rem' }">
                <ng-template #header>
                    <tr>
                        <th aglResizableColumn>Code</th>
                        <th aglResizableColumn>Name</th>
                        <th aglResizableColumn>Category</th>
                    </tr>
                </ng-template>
                <ng-template #body let-product>
                    <tr>
                        <td>{{ product.code }}</td>
                        <td>{{ product.name }}</td>
                        <td>{{ product.category }}</td>
                    </tr>
                </ng-template>
            </agl-table>
        </div>
    `
})
export class ResizeDoc {
    products = [
        { code: 'f230fh0g3', name: 'Bamboo Watch', category: 'Accessories' },
        { code: 'nvklal433', name: 'Black Watch', category: 'Accessories' },
        { code: 'zz21cz3c1', name: 'Blue Band', category: 'Fitness' },
        { code: '244wgerg2', name: 'Blue T-Shirt', category: 'Clothing' },
        { code: 'h456wer53', name: 'Bracelet', category: 'Accessories' }
    ];
}
