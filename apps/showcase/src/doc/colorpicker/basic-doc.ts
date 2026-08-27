import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColorPickerModule } from '@anguless/angulux/colorpicker';

@Component({
    selector: 'agl-colorpicker-basic-doc',
    imports: [FormsModule, ColorPickerModule],
    template: `
        <div class="card">
            <agl-colorPicker [(ngModel)]="colour" />
            <span>{{ colour }}</span>
        </div>
    `
})
export class BasicDoc {
    colour = '1976d2';
}
