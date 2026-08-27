import { Component } from '@angular/core';
import { FocusTrapModule } from '@anguless/angulux/focustrap';
import { InputTextModule } from '@anguless/angulux/inputtext';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-focustrap-basic-doc',
    imports: [FocusTrapModule, InputTextModule, ButtonModule],
    template: `
        <div class="card">
            <div aglFocusTrap style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center">
                <input aglInputText placeholder="Tab stays inside" />
                <input aglInputText placeholder="this group" />
                <agl-button label="Submit" />
            </div>
        </div>
    `
})
export class FocusTrapDoc {}
