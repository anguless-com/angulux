import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-inputtext-disabled-doc',
    standalone: true,
    imports: [FormsModule, InputTextModule],
    template: `
        <div class="card">
            <input aglInputText [(ngModel)]="value" [disabled]="true" placeholder="Disabled" />
        </div>
    `
})
export class DisabledDoc {
    value = '';
}
