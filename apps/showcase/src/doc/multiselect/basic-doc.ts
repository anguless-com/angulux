import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from '@anguless/angulux/multiselect';

@Component({
    selector: 'agl-multiselect-basic-doc',
    standalone: true,
    imports: [FormsModule, MultiSelectModule],
    template: `
        <div class="card">
            <agl-multiSelect [(ngModel)]="selected" [options]="cities" optionLabel="name" placeholder="Select cities" />
        </div>
    `
})
export class BasicDoc {
    cities = [
        { name: 'Hanoi', code: 'HAN' },
        { name: 'Da Nang', code: 'DAD' },
        { name: 'Ho Chi Minh City', code: 'SGN' },
        { name: 'Hai Phong', code: 'HPH' }
    ];

    selected: { name: string; code: string }[] = [];
}
