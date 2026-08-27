import { Component } from '@angular/core';
import { ChipModule } from '@anguless/angulux/chip';

@Component({
    selector: 'agl-chip-basic-doc',
    imports: [ChipModule],
    template: `
        <div class="card">
            <agl-chip label="Action" />
        </div>
    `
})
export class BasicDoc {}
