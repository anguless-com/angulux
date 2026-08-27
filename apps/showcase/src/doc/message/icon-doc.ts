import { Component } from '@angular/core';
import { MessageModule } from '@anguless/angulux/message';

@Component({
    selector: 'agl-message-icon-doc',
    imports: [MessageModule],
    template: `
        <div class="card">
            <agl-message severity="info" icon="pi pi-send">Message Content</agl-message>
        </div>
    `
})
export class IconDoc {}
