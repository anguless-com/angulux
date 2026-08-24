import { Component } from '@angular/core';
import { BadgeModule } from '@anguless/angulux/badge';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-badge-directive-doc',
    standalone: true,
    imports: [BadgeModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Emails" aglBadge value="8" severity="secondary" />
            <i class="pi pi-bell" aglBadge value="2" style="font-size: 1.5rem"></i>
        </div>
    `
})
export class DirectiveDoc {}
