import { Component } from '@angular/core';
import { IconFieldModule } from '@anguless/angulux/iconfield';
import { InputIconModule } from '@anguless/angulux/inputicon';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-iconfield-basic-doc',
    imports: [IconFieldModule, InputIconModule, InputTextModule],
    template: `
        <div class="card">
            <agl-iconfield>
                <agl-inputicon class="pi pi-search" />
                <input type="text" aglInputText placeholder="Search" />
            </agl-iconfield>
        </div>
    `
})
export class BasicDoc {}
