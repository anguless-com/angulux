import { Component, signal } from '@angular/core';
import { DrawerModule } from '@anguless/angulux/drawer';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-drawer-fullscreen-doc',
    imports: [DrawerModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Full screen" (onClick)="visible.set(true)" />
            <agl-drawer header="Drawer" [visible]="visible()" (visibleChange)="visible.set($event)" [fullScreen]="true">
                <p>A full-screen drawer covers the viewport.</p>
            </agl-drawer>
        </div>
    `
})
export class FullScreenDoc {
    readonly visible = signal(false);
}
