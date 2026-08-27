import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from '@anguless/angulux/selectbutton';

@Component({
    selector: 'agl-selectbutton-basic-doc',
    imports: [FormsModule, SelectButtonModule],
    template: `
        <div class="card">
            <agl-selectButton [(ngModel)]="value" [options]="options" optionLabel="label" optionValue="value" />
        </div>
    `
})
export class BasicDoc {
    options = [
        { label: 'Off', value: 'off' },
        { label: 'On', value: 'on' }
    ];

    value = 'off';
}
