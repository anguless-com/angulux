import { Component, signal } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';
import { DialogModule } from '@anguless/angulux/dialog';

@Component({
    selector: 'agl-dialog-modal-doc',
    standalone: true,
    imports: [ButtonModule, DialogModule],
    template: `
        <div class="card">
            <agl-button label="Show modal" (onClick)="visible.set(true)" />
            <agl-dialog header="Confirm" [visible]="visible()" (visibleChange)="visible.set($event)" [modal]="true" [style]="{ width: '25rem' }">
                <p>A modal dialog blocks the page behind it and traps focus until it closes.</p>
                <ng-template #footer>
                    <agl-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="visible.set(false)" />
                    <agl-button label="Confirm" (onClick)="visible.set(false)" />
                </ng-template>
            </agl-dialog>
        </div>
    `
})
export class ModalDoc {
    readonly visible = signal(false);
}
