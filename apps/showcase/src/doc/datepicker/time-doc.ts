import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from '@anguless/angulux/datepicker';

@Component({
    selector: 'agl-datepicker-time-doc',
    standalone: true,
    imports: [FormsModule, DatePickerModule],
    template: `
        <div class="card">
            <agl-datePicker [(ngModel)]="date" [showTime]="true" hourFormat="24" />
        </div>
    `
})
export class TimeDoc {
    date: Date | undefined;
}
