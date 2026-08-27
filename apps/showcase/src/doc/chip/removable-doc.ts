import { Component } from '@angular/core';
import { ChipModule } from '@anguless/angulux/chip';

@Component({
    selector: 'agl-chip-removable-doc',
    imports: [ChipModule],
    template: `
        <div class="card">
            <agl-chip label="Action" [removable]="true" />
            <agl-chip label="Comedy" icon="pi pi-star" [removable]="true" />
        </div>
    `
})
export class RemovableDoc {}
