import { Component } from '@angular/core';
import { TreeNode } from '@anguless/angulux/api';
import { TreeTableModule } from '@anguless/angulux/treetable';

@Component({
    selector: 'agl-treetable-resize-doc',
    imports: [TreeTableModule],
    template: `
        <div class="card card-block">
            <agl-treeTable [value]="nodes" [resizableColumns]="true" columnResizeMode="expand" [tableStyle]="{ 'min-width': '32rem' }">
                <ng-template #header>
                    <tr>
                        <th ttResizableColumn>Name</th>
                        <th ttResizableColumn>Size</th>
                        <th ttResizableColumn>Type</th>
                    </tr>
                </ng-template>
                <ng-template #body let-rowNode let-rowData="rowData">
                    <tr [ttRow]="rowNode">
                        <td>
                            <agl-treeTableToggler [rowNode]="rowNode" />
                            {{ rowData.name }}
                        </td>
                        <td>{{ rowData.size }}</td>
                        <td>{{ rowData.type }}</td>
                    </tr>
                </ng-template>
            </agl-treeTable>
        </div>
    `
})
export class ResizeDoc {
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
