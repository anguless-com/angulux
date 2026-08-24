import { Component } from '@angular/core';
import { BadgeModule } from '@anguless/angulux/badge';

@Component({
    selector: 'agl-badge-severity-doc',
    standalone: true,
    imports: [BadgeModule],
    template: `
        <div class="card">
            <agl-badge value="2" />
            <agl-badge value="4" severity="secondary" />
            <agl-badge value="6" severity="success" />
            <agl-badge value="8" severity="info" />
            <agl-badge value="9" severity="warn" />
            <agl-badge value="3" severity="danger" />
            <agl-badge value="5" severity="contrast" />
        </div>
    `
})
export class SeverityDoc {}
