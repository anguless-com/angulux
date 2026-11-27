import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from '@anguless/angulux/api';
import { InputTextModule } from '@anguless/angulux/inputtext';
import { TreeTableModule } from '@anguless/angulux/treetable';

@Component({
    selector: 'agl-treetable-celledit-doc',
    imports: [FormsModule, InputTextModule, TreeTableModule],
    template: `
        <div class="card card-block">
            <agl-treeTable [value]="nodes" [tableStyle]="{ 'min-width': '32rem' }">
                <ng-template #header>
                    <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Type</th>
                    </tr>
                </ng-template>
                <ng-template #body let-rowNode let-rowData="rowData">
                    <tr [ttRow]="rowNode">
                        <td>
                            <agl-treeTableToggler [rowNode]="rowNode" />
                            {{ rowData.name }}
                        </td>
                        <td [ttEditableColumn]="rowData" ttEditableColumnField="size">
                            <agl-treeTableCellEditor>
                                <ng-template #input>
                                    <input aglInputText type="text" [(ngModel)]="rowData.size" aria-label="Size" />
                                </ng-template>
                                <ng-template #output>{{ rowData.size }}</ng-template>
                            </agl-treeTableCellEditor>
                        </td>
                        <td [ttEditableColumn]="rowData" ttEditableColumnField="type">
                            <agl-treeTableCellEditor>
                                <ng-template #input>
                                    <input aglInputText type="text" [(ngModel)]="rowData.type" aria-label="Type" />
                                </ng-template>
                                <ng-template #output>{{ rowData.type }}</ng-template>
                            </agl-treeTableCellEditor>
                        </td>
                    </tr>
                </ng-template>
            </agl-treeTable>
        </div>
    `
})
export class CellEditDoc {
    nodes: TreeNode[] = [
        {
            data: { name: 'Documents', size: '75kb', type: 'Folder' },
            children: [
                { data: { name: 'Work', size: '55kb', type: 'Folder' } },
                { data: { name: 'Home', size: '20kb', type: 'Folder' } }
            ]
        },
        {
            data: { name: 'Pictures', size: '150kb', type: 'Folder' },
            children: [
                { data: { name: 'barcelona.jpg', size: '90kb', type: 'Picture' } },
                { data: { name: 'logo.png', size: '30kb', type: 'Picture' } }
            ]
        }
    ];
}
