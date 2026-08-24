import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from '@anguless/angulux/datepicker';

@Component({
    selector: 'agl-datepicker-basic-doc',
    standalone: true,
    imports: [FormsModule, DatePickerModule],
    template: `
        <div class="card">
            <agl-datePicker [(ngModel)]="date" />
        </div>
    `
})
export class BasicDoc {
    date: Date | undefined;
}
