import { Component, inject } from '@angular/core';
import { MessageService } from '@anguless/angulux/api';
import { ButtonModule } from '@anguless/angulux/button';
import { ToastModule } from '@anguless/angulux/toast';

@Component({
    selector: 'agl-toast-severity-doc',
    standalone: true,
    imports: [ButtonModule, ToastModule],
    providers: [MessageService],
    template: `
        <div class="card">
            <agl-toast />
            <agl-button label="Success" severity="success" (onClick)="show('success', 'Success', 'Message sent')" />
            <agl-button label="Info" severity="info" (onClick)="show('info', 'Info', 'Message content')" />
            <agl-button label="Warn" severity="warn" (onClick)="show('warn', 'Warning', 'Check the form')" />
            <agl-button label="Error" severity="danger" (onClick)="show('error', 'Error', 'Something failed')" />
        </div>
    `
})
export class SeverityDoc {
    private readonly messages = inject(MessageService);

    show(severity: string, summary: string, detail: string): void {
        this.messages.add({ severity, summary, detail });
    }
}
