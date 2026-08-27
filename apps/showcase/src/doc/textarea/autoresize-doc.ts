import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from '@anguless/angulux/textarea';

@Component({
    selector: 'agl-textarea-autoresize-doc',
    imports: [FormsModule, TextareaModule],
    template: `
        <div class="card">
            <textarea aglTextarea [(ngModel)]="value" [autoResize]="true" rows="2" cols="30" placeholder="Grows as you type"></textarea>
        </div>
    `
})
export class AutoResizeDoc {
    value = '';
}
