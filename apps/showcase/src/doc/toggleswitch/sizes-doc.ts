import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from '@anguless/angulux/toggleswitch';

@Component({
    selector: 'agl-toggleswitch-sizes-doc',
    standalone: true,
    imports: [FormsModule, ToggleSwitchModule],
    template: `
        <div class="card">
            <agl-toggleSwitch [(ngModel)]="small" size="small" />
            <agl-toggleSwitch [(ngModel)]="large" size="large" />
        </div>
    `
})
export class SizesDoc {
    small = true;

    large = true;
}
