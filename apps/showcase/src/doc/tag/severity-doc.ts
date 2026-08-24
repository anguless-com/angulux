import { Component } from '@angular/core';
import { TagModule } from '@anguless/angulux/tag';

@Component({
    selector: 'agl-tag-severity-doc',
    standalone: true,
    imports: [TagModule],
    template: `
        <div class="card">
            <agl-tag value="Primary" />
            <agl-tag severity="secondary" value="Secondary" />
            <agl-tag severity="success" value="Success" />
            <agl-tag severity="info" value="Info" />
            <agl-tag severity="warn" value="Warn" />
            <agl-tag severity="danger" value="Danger" />
            <agl-tag severity="contrast" value="Contrast" />
        </div>
    `
})
export class SeverityDoc {}
