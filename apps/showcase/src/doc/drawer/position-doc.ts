import { Component, signal } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';
import { DrawerModule } from '@anguless/angulux/drawer';

type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';

@Component({
    selector: 'agl-drawer-position-doc',
    imports: [ButtonModule, DrawerModule],
    template: `
        <div class="card">
            <agl-button label="Left" (onClick)="open('left')" />
            <agl-button label="Right" (onClick)="open('right')" />
            <agl-button label="Top" (onClick)="open('top')" />
            <agl-button label="Bottom" (onClick)="open('bottom')" />
            <agl-drawer header="Drawer" [visible]="visible()" (visibleChange)="visible.set($event)" [position]="position()">
                <p>Position decides which edge it comes from.</p>
            </agl-drawer>
        </div>
    `
})
export class PositionDoc {
    readonly visible = signal(false);

    readonly position = signal<DrawerPosition>('left');

    open(position: DrawerPosition): void {
        this.position.set(position);
        this.visible.set(true);
    }
}
