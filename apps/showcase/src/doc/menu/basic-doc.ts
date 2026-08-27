import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { MenuModule } from '@anguless/angulux/menu';

@Component({
    selector: 'agl-menu-basic-doc',
    imports: [MenuModule],
    template: `
        <div class="card">
            <agl-menu [model]="items" />
        </div>
    `
})
export class BasicDoc {
    items: MenuItem[] = [
        {
            label: 'File',
            items: [
                { label: 'New', icon: 'pi pi-plus' },
                { label: 'Open', icon: 'pi pi-folder-open' }
            ]
        },
        {
            label: 'Edit',
            items: [
                { label: 'Copy', icon: 'pi pi-copy' },
                { label: 'Paste', icon: 'pi pi-clipboard' }
            ]
        }
    ];
}
