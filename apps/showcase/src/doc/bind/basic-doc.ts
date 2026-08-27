import { Component } from '@angular/core';
import { BindModule } from '@anguless/angulux/bind';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-bind-basic-doc',
    imports: [BindModule, InputTextModule],
    template: `
        <div class="card">
            <input aglInputText [aglBind]="attributes" />
        </div>
    `
})
export class BasicDoc {
    attributes = { placeholder: 'Attributes applied in one binding', 'aria-label': 'Bound input', maxlength: 20 };
}
