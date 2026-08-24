import { Component } from '@angular/core';
import { MessageModule } from '@anguless/angulux/message';

@Component({
    selector: 'agl-message-closable-doc',
    standalone: true,
    imports: [MessageModule],
    template: `
        <div class="card">
            <agl-message [closable]="true">Closable Message</agl-message>
        </div>
    `
})
export class ClosableDoc {}
