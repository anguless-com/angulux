import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from '@anguless/angulux/radiobutton';

@Component({
    selector: 'agl-radiobutton-basic-doc',
    imports: [FormsModule, RadioButtonModule],
    template: `
        <div class="card">
            @for (city of cities; track city) {
                <agl-radioButton [(ngModel)]="selected" [value]="city" [inputId]="city" name="city" />
                <label [for]="city">{{ city }}</label>
            }
        </div>
    `
})
export class BasicDoc {
    cities = ['Hanoi', 'Da Nang', 'Ho Chi Minh City'];

    selected = 'Hanoi';
}
