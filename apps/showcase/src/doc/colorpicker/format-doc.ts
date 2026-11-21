import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { ColorPickerModule } from '@anguless/angulux/colorpicker';

@Component({
    selector: 'agl-colorpicker-format-doc',
    imports: [FormsModule, JsonPipe, ColorPickerModule],
    template: `
        <div class="card">
            <agl-colorPicker [(ngModel)]="colour" format="rgb" />
            <span>{{ colour | json }}</span>
        </div>
    `
})
export class FormatDoc {
    colour = { r: 25, g: 118, b: 210 };
}
