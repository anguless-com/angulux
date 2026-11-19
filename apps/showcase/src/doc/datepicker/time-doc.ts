import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from '@anguless/angulux/datepicker';

@Component({
    selector: 'agl-datepicker-time-doc',
    imports: [FormsModule, DatePickerModule],
    template: `
        <div class="card">
            <agl-datePicker [(ngModel)]="date" [showTime]="true" hourFormat="24" ariaLabel="Date and time" />
        </div>
    `
})
export class TimeDoc {
    date: Date | undefined;
}
