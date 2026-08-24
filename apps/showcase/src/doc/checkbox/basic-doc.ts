import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from '@anguless/angulux/checkbox';

@Component({
    selector: 'agl-checkbox-basic-doc',
    standalone: true,
    imports: [FormsModule, CheckboxModule],
    template: `
        <div class="card">
            <agl-checkbox [(ngModel)]="checked" [binary]="true" inputId="agree" />
            <label for="agree">I agree</label>
        </div>
    `
})
export class BasicDoc {
    checked = false;
}
