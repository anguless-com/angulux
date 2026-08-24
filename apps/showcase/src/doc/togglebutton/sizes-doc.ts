import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleButtonModule } from '@anguless/angulux/togglebutton';

@Component({
    selector: 'agl-togglebutton-sizes-doc',
    standalone: true,
    imports: [FormsModule, ToggleButtonModule],
    template: `
        <div class="card">
            <agl-toggleButton [(ngModel)]="small" onLabel="On" offLabel="Off" size="small" />
            <agl-toggleButton [(ngModel)]="large" onLabel="On" offLabel="Off" size="large" />
        </div>
    `
})
export class SizesDoc {
    small = false;

    large = false;
}
