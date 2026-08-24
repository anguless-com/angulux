import { Component } from '@angular/core';
import { MessageModule } from '@anguless/angulux/message';

@Component({
    selector: 'agl-message-severity-doc',
    standalone: true,
    imports: [MessageModule],
    template: `
        <div class="card">
            <div style="width: 100%; display: grid; gap: 0.5rem">
                <agl-message severity="success">Success Message</agl-message>
                <agl-message severity="info">Info Message</agl-message>
                <agl-message severity="warn">Warn Message</agl-message>
                <agl-message severity="error">Error Message</agl-message>
                <agl-message severity="secondary">Secondary Message</agl-message>
                <agl-message severity="contrast">Contrast Message</agl-message>
            </div>
        </div>
    `
})
export class SeverityDoc {}
