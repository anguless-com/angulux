import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from '@anguless/angulux/datepicker';

@Component({
    selector: 'agl-datepicker-icon-doc',
    standalone: true,
    imports: [FormsModule, DatePickerModule],
    template: `
        <div class="card">
            <agl-datePicker [(ngModel)]="date" [showIcon]="true" [showButtonBar]="true" />
        </div>
    `
})
export class IconDoc {
    date: Date | undefined;
}
