import { Component } from '@angular/core';
import { MessageModule } from '@anguless/angulux/message';

@Component({
    selector: 'agl-message-basic-doc',
    standalone: true,
    imports: [MessageModule],
    template: `
        <div class="card">
            <agl-message>Message Content</agl-message>
        </div>
    `
})
export class BasicDoc {}
