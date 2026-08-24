import { Component } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-button-severity-doc',
    standalone: true,
    imports: [ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Primary" />
            <agl-button label="Secondary" severity="secondary" />
            <agl-button label="Success" severity="success" />
            <agl-button label="Info" severity="info" />
            <agl-button label="Warn" severity="warn" />
            <agl-button label="Help" severity="help" />
            <agl-button label="Danger" severity="danger" />
            <agl-button label="Contrast" severity="contrast" />
        </div>
    `
})
export class SeverityDoc {}
