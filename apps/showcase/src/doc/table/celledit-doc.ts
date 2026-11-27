import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from '@anguless/angulux/inputtext';
import { TableModule } from '@anguless/angulux/table';

@Component({
    selector: 'agl-table-celledit-doc',
    imports: [FormsModule, InputTextModule, TableModule],
    template: `
        <div class="card card-block">
            <agl-table [value]="products" dataKey="code" [tableStyle]="{ 'min-width': '32rem' }">
                <ng-template #header>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Quantity</th>
                    </tr>
                </ng-template>
                <ng-template #body let-product>
                    <tr>
                        <td>{{ product.code }}</td>
                        <td [aglEditableColumn]="product" aglEditableColumnField="name">
                            <agl-cellEditor>
                                <ng-template #input>
                                    <input aglInputText type="text" [(ngModel)]="product.name" aria-label="Name" />
                                </ng-template>
                                <ng-template #output>{{ product.name }}</ng-template>
                            </agl-cellEditor>
                        </td>
                        <td [aglEditableColumn]="product" aglEditableColumnField="quantity">
                            <agl-cellEditor>
                                <ng-template #input>
                                    <input aglInputText type="number" [(ngModel)]="product.quantity" aria-label="Quantity" />
                                </ng-template>
                                <ng-template #output>{{ product.quantity }}</ng-template>
                            </agl-cellEditor>
                        </td>
                    </tr>
                </ng-template>
            </agl-table>
        </div>
    `
})
export class CellEditDoc {
    products = [
        { code: 'f230fh0g3', name: 'Bamboo Watch', quantity: 24 },
        { code: 'nvklal433', name: 'Black Watch', quantity: 61 },
        { code: 'zz21cz3c1', name: 'Blue Band', quantity: 2 },
        { code: '244wgerg2', name: 'Blue T-Shirt', quantity: 25 },
        { code: 'h456wer53', name: 'Bracelet', quantity: 73 }
    ];
}
