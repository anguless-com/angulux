import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from '@anguless/angulux/inputnumber';

@Component({
    selector: 'agl-inputnumber-currency-doc',
    standalone: true,
    imports: [FormsModule, InputNumberModule],
    template: `
        <div class="card">
            <agl-inputNumber [(ngModel)]="usd" mode="currency" currency="USD" locale="en-US" />
            <agl-inputNumber [(ngModel)]="vnd" mode="currency" currency="VND" locale="vi-VN" />
        </div>
    `
})
export class CurrencyDoc {
    usd = 1500;

    vnd = 2500000;
}
