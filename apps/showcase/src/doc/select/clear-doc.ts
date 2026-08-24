import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from '@anguless/angulux/select';

interface City {
    name: string;
    code: string;
}

@Component({
    selector: 'agl-select-clear-doc',
    standalone: true,
    imports: [FormsModule, SelectModule],
    template: `
        <div class="card">
            <agl-select [(ngModel)]="selected" [options]="cities" [showClear]="true" optionLabel="name" placeholder="Select a city" />
        </div>
    `
})
export class ClearDoc {
    cities: City[] = [
        { name: 'Hanoi', code: 'HAN' },
        { name: 'Da Nang', code: 'DAD' },
        { name: 'Ho Chi Minh City', code: 'SGN' }
    ];

    selected: City | undefined;
}
