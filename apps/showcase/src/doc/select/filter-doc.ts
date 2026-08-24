import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from '@anguless/angulux/select';

interface City {
    name: string;
    code: string;
}

@Component({
    selector: 'agl-select-filter-doc',
    standalone: true,
    imports: [FormsModule, SelectModule],
    template: `
        <div class="card">
            <agl-select [(ngModel)]="selected" [options]="cities" [filter]="true" filterBy="name" optionLabel="name" placeholder="Select a city" />
        </div>
    `
})
export class FilterDoc {
    cities: City[] = [
        { name: 'Hanoi', code: 'HAN' },
        { name: 'Da Nang', code: 'DAD' },
        { name: 'Ho Chi Minh City', code: 'SGN' },
        { name: 'Hai Phong', code: 'HPH' },
        { name: 'Can Tho', code: 'VCA' }
    ];

    selected: City | undefined;
}
