import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { MenuModule } from '@anguless/angulux/menu';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-menu-popup-doc',
    standalone: true,
    imports: [MenuModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Show" icon="pi pi-bars" (onClick)="menu.toggle($event)" />
            <agl-menu #menu [model]="items" [popup]="true" />
        </div>
    `
})
export class PopupDoc {
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
