import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from '@anguless/angulux/radiobutton';

@Component({
    selector: 'agl-radiobutton-sizes-doc',
    imports: [FormsModule, RadioButtonModule],
    template: `
        <div class="card">
            <agl-radioButton [(ngModel)]="selected" value="small" size="small" name="size" ariaLabel="Small" />
            <agl-radioButton [(ngModel)]="selected" value="normal" name="size" ariaLabel="Normal" />
            <agl-radioButton [(ngModel)]="selected" value="large" size="large" name="size" ariaLabel="Large" />
        </div>
    `
})
export class SizesDoc {
    selected = 'normal';
}
