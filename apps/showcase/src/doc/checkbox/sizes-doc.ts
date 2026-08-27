import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from '@anguless/angulux/checkbox';

@Component({
    selector: 'agl-checkbox-sizes-doc',
    imports: [FormsModule, CheckboxModule],
    template: `
        <div class="card">
            <agl-checkbox [(ngModel)]="small" size="small" [binary]="true" />
            <agl-checkbox [(ngModel)]="normal" [binary]="true" />
            <agl-checkbox [(ngModel)]="large" size="large" [binary]="true" />
        </div>
    `
})
export class SizesDoc {
    small = false;

    normal = false;

    large = false;
}
