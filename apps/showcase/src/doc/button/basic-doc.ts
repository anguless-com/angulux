import { Component } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-button-basic-doc',
    imports: [ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Submit" />
        </div>
    `
})
export class BasicDoc {}
