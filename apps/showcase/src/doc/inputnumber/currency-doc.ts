import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from '@anguless/angulux/inputnumber';

@Component({
    selector: 'agl-inputnumber-currency-doc',
    imports: [FormsModule, InputNumberModule],
    template: `
        <div class="card">
            <agl-inputNumber [(ngModel)]="usd" mode="currency" currency="USD" locale="en-US" ariaLabel="Price in US dollars" />
            <agl-inputNumber [(ngModel)]="vnd" mode="currency" currency="VND" locale="vi-VN" ariaLabel="Price in Vietnamese dong" />
        </div>
    `
})
export class CurrencyDoc {
    usd = 1500;

    vnd = 2500000;
}
