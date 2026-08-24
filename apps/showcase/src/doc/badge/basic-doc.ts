import { Component } from '@angular/core';
import { BadgeModule } from '@anguless/angulux/badge';

@Component({
    selector: 'agl-badge-basic-doc',
    standalone: true,
    imports: [BadgeModule],
    template: `
        <div class="card">
            <agl-badge value="2" />
        </div>
    `
})
export class BasicDoc {}
