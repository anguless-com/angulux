import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from '@anguless/angulux/radiobutton';

@Component({
    selector: 'agl-radiobutton-sizes-doc',
    imports: [FormsModule, RadioButtonModule],
    template: `
        <div class="card">
            <agl-radioButton [(ngModel)]="selected" value="small" size="small" name="size" />
            <agl-radioButton [(ngModel)]="selected" value="normal" name="size" />
            <agl-radioButton [(ngModel)]="selected" value="large" size="large" name="size" />
        </div>
    `
})
export class SizesDoc {
    selected = 'normal';
}
