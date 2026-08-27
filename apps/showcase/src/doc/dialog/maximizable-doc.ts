import { Component, signal } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';
import { DialogModule } from '@anguless/angulux/dialog';

@Component({
    selector: 'agl-dialog-maximizable-doc',
    imports: [ButtonModule, DialogModule],
    template: `
        <div class="card">
            <agl-button label="Show maximizable" (onClick)="visible.set(true)" />
            <agl-dialog header="Report" [visible]="visible()" (visibleChange)="visible.set($event)" [modal]="true" [maximizable]="true" [style]="{ width: '30rem' }">
                <p>Maximizable adds a control to the header that expands the dialog to the full viewport and back.</p>
            </agl-dialog>
        </div>
    `
})
export class MaximizableDoc {
    readonly visible = signal(false);
}
