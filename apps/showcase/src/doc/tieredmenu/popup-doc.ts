import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { TieredMenuModule } from '@anguless/angulux/tieredmenu';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-tieredmenu-popup-doc',
    imports: [TieredMenuModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Show" icon="pi pi-bars" (onClick)="menu.toggle($event)" />
            <agl-tieredMenu #menu [model]="items" [popup]="true" />
        </div>
    `
})
export class PopupDoc {
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
