import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from '@anguless/angulux/toggleswitch';

@Component({
    selector: 'agl-toggleswitch-preselection-doc',
    standalone: true,
    imports: [FormsModule, ToggleSwitchModule],
    template: `
        <div class="card">
            <agl-toggleSwitch [(ngModel)]="checked" trueValue="on" falseValue="off" />
            <span>{{ checked }}</span>
        </div>
    `
})
export class PreselectionDoc {
    checked = 'on';
}
