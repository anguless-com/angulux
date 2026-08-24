import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-inputtext-invalid-doc',
    standalone: true,
    imports: [FormsModule, InputTextModule],
    template: `
        <div class="card">
            <input aglInputText [invalid]="!value" [(ngModel)]="value" placeholder="Required" />
        </div>
    `
})
export class InvalidDoc {
    value = '';
}
