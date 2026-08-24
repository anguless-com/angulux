import { Component } from '@angular/core';
import { ChipModule } from '@anguless/angulux/chip';

@Component({
    selector: 'agl-chip-icon-doc',
    standalone: true,
    imports: [ChipModule],
    template: `
        <div class="card">
            <agl-chip label="Apple" icon="pi pi-apple" />
            <agl-chip label="Facebook" icon="pi pi-facebook" />
            <agl-chip label="Google" icon="pi pi-google" />
        </div>
    `
})
export class IconDoc {}
