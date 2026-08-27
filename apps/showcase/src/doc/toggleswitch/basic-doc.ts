import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from '@anguless/angulux/toggleswitch';

@Component({
    selector: 'agl-toggleswitch-basic-doc',
    imports: [FormsModule, ToggleSwitchModule],
    template: `
        <div class="card">
            <agl-toggleSwitch [(ngModel)]="checked" />
        </div>
    `
})
export class BasicDoc {
    checked = false;
}
