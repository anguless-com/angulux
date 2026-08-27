import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from '@anguless/angulux/datepicker';

@Component({
    selector: 'agl-datepicker-inline-doc',
    imports: [FormsModule, DatePickerModule],
    template: `
        <div class="card">
            <agl-datePicker [(ngModel)]="date" [inline]="true" />
        </div>
    `
})
export class InlineDoc {
    date: Date | undefined;
}
