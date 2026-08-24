import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from '@anguless/angulux/multiselect';

@Component({
    selector: 'agl-multiselect-chips-doc',
    standalone: true,
    imports: [FormsModule, MultiSelectModule],
    template: `
        <div class="card">
            <agl-multiSelect [(ngModel)]="selected" [options]="cities" optionLabel="name" display="chip" placeholder="Select cities" />
        </div>
    `
})
export class ChipsDoc {
    cities = [
        { name: 'Hanoi', code: 'HAN' },
        { name: 'Da Nang', code: 'DAD' },
        { name: 'Ho Chi Minh City', code: 'SGN' }
    ];

    selected: { name: string; code: string }[] = [];
}
