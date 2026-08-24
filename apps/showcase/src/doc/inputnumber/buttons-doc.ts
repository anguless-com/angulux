import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from '@anguless/angulux/inputnumber';

@Component({
    selector: 'agl-inputnumber-buttons-doc',
    standalone: true,
    imports: [FormsModule, InputNumberModule],
    template: `
        <div class="card">
            <agl-inputNumber [(ngModel)]="stacked" [showButtons]="true" [min]="0" [max]="100" />
            <agl-inputNumber [(ngModel)]="horizontal" [showButtons]="true" buttonLayout="horizontal" [min]="0" [max]="100" incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" />
        </div>
    `
})
export class ButtonsDoc {
    stacked = 10;

    horizontal = 20;
}
