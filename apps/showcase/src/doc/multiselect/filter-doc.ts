import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from '@anguless/angulux/multiselect';

@Component({
    selector: 'agl-multiselect-filter-doc',
    imports: [FormsModule, MultiSelectModule],
    template: `
        <div class="card">
            <agl-multiSelect [(ngModel)]="selected" [options]="cities" [filter]="true" filterBy="name" optionLabel="name" placeholder="Select cities" />
        </div>
    `
})
export class FilterDoc {
    cities = [
        { name: 'Hanoi', code: 'HAN' },
        { name: 'Da Nang', code: 'DAD' },
        { name: 'Ho Chi Minh City', code: 'SGN' },
        { name: 'Hai Phong', code: 'HPH' },
        { name: 'Can Tho', code: 'VCA' }
    ];

    selected: { name: string; code: string }[] = [];
}
