import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleButtonModule } from '@anguless/angulux/togglebutton';

@Component({
    selector: 'agl-togglebutton-basic-doc',
    standalone: true,
    imports: [FormsModule, ToggleButtonModule],
    template: `
        <div class="card">
            <agl-toggleButton [(ngModel)]="checked" onLabel="Yes" offLabel="No" />
        </div>
    `
})
export class BasicDoc {
    checked = false;
}
