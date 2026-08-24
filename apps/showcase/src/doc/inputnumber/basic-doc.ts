import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from '@anguless/angulux/inputnumber';

@Component({
    selector: 'agl-inputnumber-basic-doc',
    standalone: true,
    imports: [FormsModule, InputNumberModule],
    template: `
        <div class="card">
            <agl-inputNumber [(ngModel)]="value" inputId="qty" />
        </div>
    `
})
export class BasicDoc {
    value = 42;
}
