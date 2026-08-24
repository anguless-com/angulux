import { Component, signal } from '@angular/core';
import { DrawerModule } from '@anguless/angulux/drawer';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-drawer-basic-doc',
    standalone: true,
    imports: [DrawerModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button icon="pi pi-bars" label="Open" (onClick)="visible.set(true)" />
            <agl-drawer header="Drawer" [visible]="visible()" (visibleChange)="visible.set($event)">
                <p>Content of the drawer.</p>
            </agl-drawer>
        </div>
    `
})
export class BasicDoc {
    readonly visible = signal(false);
}
