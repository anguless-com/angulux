import { Component, inject, signal } from '@angular/core';
import { ConfirmationService } from '@anguless/angulux/api';
import { ConfirmDialogModule } from '@anguless/angulux/confirmdialog';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-confirmdialog-basic-doc',
    imports: [ConfirmDialogModule, ButtonModule],
    providers: [ConfirmationService],
    template: `
        <div class="card">
            <agl-confirmDialog />
            <agl-button label="Delete" severity="danger" (onClick)="confirm()" />
            <span>{{ result() }}</span>
        </div>
    `
})
export class BasicDoc {
    private readonly confirmation = inject(ConfirmationService);

    readonly result = signal('');

    confirm(): void {
        this.confirmation.confirm({
            message: 'Delete this record?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.result.set('accepted'),
            reject: () => this.result.set('rejected')
        });
    }
}
