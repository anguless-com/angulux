import { Component } from '@angular/core';
import { AutoFocusModule } from '@anguless/angulux/autofocus';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-autofocus-basic-doc',
    standalone: true,
    imports: [AutoFocusModule, InputTextModule],
    template: `
        <div class="card">
            <input aglInputText [aglAutoFocus]="true" placeholder="Focused on load" />
        </div>
    `
})
export class BasicDoc {}
