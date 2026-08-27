import { Component, signal } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';
import { DialogModule } from '@anguless/angulux/dialog';

@Component({
    selector: 'agl-dialog-basic-doc',
    imports: [ButtonModule, DialogModule],
    template: `
        <div class="card">
            <agl-button label="Show" (onClick)="visible.set(true)" />
            <agl-dialog header="Edit Profile" [visible]="visible()" (visibleChange)="visible.set($event)" [style]="{ width: '25rem' }">
                <p>Update your information and click Save when you are done.</p>
            </agl-dialog>
        </div>
    `
})
export class BasicDoc {
    readonly visible = signal(false);
}
