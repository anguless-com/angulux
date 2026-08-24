import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { TieredMenuModule } from '@anguless/angulux/tieredmenu';

@Component({
    selector: 'agl-tieredmenu-basic-doc',
    standalone: true,
    imports: [TieredMenuModule],
    template: `
        <div class="card">
            <agl-tieredMenu [model]="items" />
        </div>
    `
})
export class BasicDoc {
    items: MenuItem[] = [
        {
            label: 'File',
            icon: 'pi pi-file',
            items: [
                { label: 'New', icon: 'pi pi-plus', items: [{ label: 'Document' }, { label: 'Image' }] },
                { label: 'Open', icon: 'pi pi-folder-open' }
            ]
        },
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            items: [{ label: 'Copy', icon: 'pi pi-copy' }, { label: 'Paste', icon: 'pi pi-clipboard' }]
        }
    ];
}
