import { Component } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-button-sizes-doc',
    imports: [ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Small" icon="pi pi-check" size="small" />
            <agl-button label="Normal" icon="pi pi-check" />
            <agl-button label="Large" icon="pi pi-check" size="large" />
        </div>
    `
})
export class SizesDoc {}
