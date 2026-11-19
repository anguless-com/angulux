import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from '@anguless/angulux/checkbox';

@Component({
    selector: 'agl-checkbox-sizes-doc',
    imports: [FormsModule, CheckboxModule],
    template: `
        <div class="card">
            <agl-checkbox [(ngModel)]="small" size="small" [binary]="true" ariaLabel="Small" />
            <agl-checkbox [(ngModel)]="normal" [binary]="true" ariaLabel="Normal" />
            <agl-checkbox [(ngModel)]="large" size="large" [binary]="true" ariaLabel="Large" />
        </div>
    `
})
export class SizesDoc {
    small = false;

    normal = false;

    large = false;
}
