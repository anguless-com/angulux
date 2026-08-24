import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleButtonModule } from '@anguless/angulux/togglebutton';

@Component({
    selector: 'agl-togglebutton-icons-doc',
    standalone: true,
    imports: [FormsModule, ToggleButtonModule],
    template: `
        <div class="card">
            <agl-toggleButton [(ngModel)]="checked" onLabel="Locked" offLabel="Unlocked" onIcon="pi pi-lock" offIcon="pi pi-lock-open" />
        </div>
    `
})
export class IconsDoc {
    checked = false;
}
