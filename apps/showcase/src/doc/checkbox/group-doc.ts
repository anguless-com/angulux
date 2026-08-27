import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from '@anguless/angulux/checkbox';

@Component({
    selector: 'agl-checkbox-group-doc',
    imports: [FormsModule, CheckboxModule],
    template: `
        <div class="card">
            @for (city of cities; track city) {
                <agl-checkbox [(ngModel)]="selected" [value]="city" [inputId]="city" name="cities" />
                <label [for]="city">{{ city }}</label>
            }
        </div>
    `
})
export class GroupDoc {
    cities = ['Hanoi', 'Da Nang', 'Ho Chi Minh City'];

    selected: string[] = [];
}
