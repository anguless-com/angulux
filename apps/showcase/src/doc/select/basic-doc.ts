import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from '@anguless/angulux/select';

interface City {
    name: string;
    code: string;
}

@Component({
    selector: 'agl-select-basic-doc',
    standalone: true,
    imports: [FormsModule, SelectModule],
    template: `
        <div class="card">
            <agl-select [(ngModel)]="selected" [options]="cities" optionLabel="name" placeholder="Select a city" />
        </div>
    `
})
export class BasicDoc {
    cities: City[] = [
        { name: 'Hanoi', code: 'HAN' },
        { name: 'Da Nang', code: 'DAD' },
        { name: 'Ho Chi Minh City', code: 'SGN' },
        { name: 'Hai Phong', code: 'HPH' }
    ];

    selected: City | undefined;
}
