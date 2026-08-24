import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from '@anguless/angulux/textarea';

@Component({
    selector: 'agl-textarea-basic-doc',
    standalone: true,
    imports: [FormsModule, TextareaModule],
    template: `
        <div class="card">
            <textarea aglTextarea [(ngModel)]="value" rows="5" cols="30" placeholder="Your message"></textarea>
        </div>
    `
})
export class BasicDoc {
    value = '';
}
