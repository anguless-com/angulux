import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from '@anguless/angulux/textarea';

@Component({
    selector: 'agl-textarea-invalid-doc',
    standalone: true,
    imports: [FormsModule, TextareaModule],
    template: `
        <div class="card">
            <textarea aglTextarea [(ngModel)]="value" [invalid]="!value" rows="3" cols="30" placeholder="Required"></textarea>
        </div>
    `
})
export class InvalidDoc {
    value = '';
}
