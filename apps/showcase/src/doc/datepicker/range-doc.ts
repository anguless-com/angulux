import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from '@anguless/angulux/datepicker';

@Component({
    selector: 'agl-datepicker-range-doc',
    standalone: true,
    imports: [FormsModule, DatePickerModule],
    template: `
        <div class="card">
            <agl-datePicker [(ngModel)]="dates" selectionMode="range" [readonlyInput]="true" />
        </div>
    `
})
export class RangeDoc {
    dates: Date[] | undefined;
}
