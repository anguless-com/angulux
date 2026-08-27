import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from '@anguless/angulux/select';

@Component({
    selector: 'agl-select-editable-doc',
    imports: [FormsModule, SelectModule],
    template: `
        <div class="card">
            <agl-select [(ngModel)]="selected" [options]="cities" [editable]="true" placeholder="Select or type" />
        </div>
    `
})
export class EditableDoc {
    cities = ['Hanoi', 'Da Nang', 'Ho Chi Minh City'];

    selected: string | undefined;
}
