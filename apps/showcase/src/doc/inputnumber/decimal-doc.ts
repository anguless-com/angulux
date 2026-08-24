import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from '@anguless/angulux/inputnumber';

@Component({
    selector: 'agl-inputnumber-decimal-doc',
    standalone: true,
    imports: [FormsModule, InputNumberModule],
    template: `
        <div class="card">
            <agl-inputNumber [(ngModel)]="value" [minFractionDigits]="2" [maxFractionDigits]="5" />
            <agl-inputNumber [(ngModel)]="percent" suffix="%" [min]="0" [max]="100" />
        </div>
    `
})
export class DecimalDoc {
    value = 3.14159;

    percent = 60;
}
