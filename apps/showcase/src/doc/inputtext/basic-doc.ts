import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-inputtext-basic-doc',
    standalone: true,
    imports: [FormsModule, InputTextModule],
    template: `
        <div class="card">
            <input aglInputText [(ngModel)]="value" placeholder="Name" />
        </div>
    `
})
export class BasicDoc {
    value = '';
}
