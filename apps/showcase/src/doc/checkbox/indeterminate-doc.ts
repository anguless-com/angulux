import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from '@anguless/angulux/checkbox';

@Component({
    selector: 'agl-checkbox-indeterminate-doc',
    standalone: true,
    imports: [FormsModule, CheckboxModule],
    template: `
        <div class="card">
            <agl-checkbox [(ngModel)]="checked" [indeterminate]="true" [binary]="true" />
        </div>
    `
})
export class IndeterminateDoc {
    checked = false;
}
