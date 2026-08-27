import { Component, inject } from '@angular/core';
import { MessageService } from '@anguless/angulux/api';
import { ButtonModule } from '@anguless/angulux/button';
import { ToastModule } from '@anguless/angulux/toast';

@Component({
    selector: 'agl-toast-basic-doc',
    imports: [ButtonModule, ToastModule],
    providers: [MessageService],
    template: `
        <div class="card">
            <agl-toast />
            <agl-button label="Show" (onClick)="show()" />
        </div>
    `
})
export class BasicDoc {
    private readonly messages = inject(MessageService);

    show(): void {
        this.messages.add({ severity: 'info', summary: 'Info', detail: 'Message content' });
    }
}
