import { Component, inject } from '@angular/core';
import { MessageService } from '@anguless/angulux/api';
import { ButtonModule } from '@anguless/angulux/button';
import { ToastModule } from '@anguless/angulux/toast';

@Component({
    selector: 'agl-toast-position-doc',
    imports: [ButtonModule, ToastModule],
    providers: [MessageService],
    template: `
        <div class="card">
            <agl-toast position="top-left" key="tl" />
            <agl-toast position="bottom-center" key="bc" />
            <agl-button label="Top left" (onClick)="show('tl')" />
            <agl-button label="Bottom center" (onClick)="show('bc')" />
        </div>
    `
})
export class PositionDoc {
    private readonly messages = inject(MessageService);

    show(key: string): void {
        this.messages.add({ key, severity: 'info', summary: 'Info', detail: 'Message content' });
    }
}
