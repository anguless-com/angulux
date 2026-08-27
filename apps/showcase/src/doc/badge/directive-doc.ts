import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from '@anguless/angulux/badge';
import { ButtonModule } from '@anguless/angulux/button';
import { ToggleButtonModule } from '@anguless/angulux/togglebutton';

@Component({
    selector: 'agl-badge-directive-doc',
    imports: [FormsModule, BadgeModule, ButtonModule, ToggleButtonModule],
    template: `
        <div class="card">
            <agl-button label="Emails" aglBadge value="8" severity="secondary" />
            <agl-toggleButton [(ngModel)]="muted" onLabel="Muted" offLabel="Alerts" aglBadge value="3" severity="danger" />
            <i class="pi pi-bell" aglBadge value="2" style="font-size: 1.5rem"></i>
        </div>
    `
})
export class DirectiveDoc {
    muted = false;
}
