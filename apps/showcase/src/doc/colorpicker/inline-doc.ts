import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColorPickerModule } from '@anguless/angulux/colorpicker';

@Component({
    selector: 'agl-colorpicker-inline-doc',
    imports: [FormsModule, ColorPickerModule],
    template: `
        <div class="card">
            <agl-colorPicker [(ngModel)]="colour" [inline]="true" />
        </div>
    `
})
export class InlineDoc {
    colour = '1976d2';
}
