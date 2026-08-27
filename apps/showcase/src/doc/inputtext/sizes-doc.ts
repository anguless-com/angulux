import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-inputtext-sizes-doc',
    imports: [FormsModule, InputTextModule],
    template: `
        <div class="card">
            <input aglInputText aglSize="small" [(ngModel)]="small" placeholder="Small" />
            <input aglInputText [(ngModel)]="normal" placeholder="Normal" />
            <input aglInputText aglSize="large" [(ngModel)]="large" placeholder="Large" />
        </div>
    `
})
export class SizesDoc {
    small = '';

    normal = '';

    large = '';
}
