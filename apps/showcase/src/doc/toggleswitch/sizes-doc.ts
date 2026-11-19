import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from '@anguless/angulux/toggleswitch';

@Component({
    selector: 'agl-toggleswitch-sizes-doc',
    imports: [FormsModule, ToggleSwitchModule],
    template: `
        <div class="card">
            <agl-toggleSwitch [(ngModel)]="small" size="small" ariaLabel="Small" />
            <agl-toggleSwitch [(ngModel)]="large" size="large" ariaLabel="Large" />
        </div>
    `
})
export class SizesDoc {
    small = true;

    large = true;
}
