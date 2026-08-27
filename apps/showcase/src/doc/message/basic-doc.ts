import { Component } from '@angular/core';
import { MessageModule } from '@anguless/angulux/message';

@Component({
    selector: 'agl-message-basic-doc',
    imports: [MessageModule],
    template: `
        <div class="card">
            <agl-message>Message Content</agl-message>
        </div>
    `
})
export class BasicDoc {}
