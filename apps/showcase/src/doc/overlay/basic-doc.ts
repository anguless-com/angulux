import { Component, signal } from '@angular/core';
import { OverlayModule } from '@anguless/angulux/overlay';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-overlay-basic-doc',
    standalone: true,
    imports: [OverlayModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Toggle" (onClick)="visible.set(!visible())" />
            <agl-overlay [visible]="visible()" (visibleChange)="visible.set($event)" [style]="{ padding: '1rem', minWidth: '16rem' }">
                <p style="margin: 0">Overlay is the positioning primitive the select, popover and menu overlays are built on.</p>
            </agl-overlay>
        </div>
    `
})
export class BasicDoc {
    readonly visible = signal(false);
}
