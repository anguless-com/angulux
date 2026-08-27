import { Component } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-button-disabled-doc',
    imports: [ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Submit" [disabled]="true" />
        </div>
    `
})
export class DisabledDoc {}
