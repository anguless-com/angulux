import { Component } from '@angular/core';
import { IconFieldModule } from '@anguless/angulux/iconfield';
import { InputIconModule } from '@anguless/angulux/inputicon';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-iconfield-position-doc',
    imports: [IconFieldModule, InputIconModule, InputTextModule],
    template: `
        <div class="card">
            <agl-iconfield>
                <agl-inputicon class="pi pi-user" />
                <input type="text" aglInputText placeholder="Icon first" />
            </agl-iconfield>
            <agl-iconfield>
                <input type="text" aglInputText placeholder="Icon last" />
                <agl-inputicon class="pi pi-spin pi-spinner" />
            </agl-iconfield>
        </div>
    `
})
export class PositionDoc {}
