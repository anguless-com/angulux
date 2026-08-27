import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from '@anguless/angulux/selectbutton';

@Component({
    selector: 'agl-selectbutton-multiple-doc',
    imports: [FormsModule, SelectButtonModule],
    template: `
        <div class="card">
            <agl-selectButton [(ngModel)]="value" [options]="options" [multiple]="true" optionLabel="label" optionValue="value" />
        </div>
    `
})
export class MultipleDoc {
    options = [
        { label: 'Bold', value: 'bold' },
        { label: 'Italic', value: 'italic' },
        { label: 'Underline', value: 'underline' }
    ];

    value: string[] = ['bold'];
}
