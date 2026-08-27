import { Component } from '@angular/core';
import { ProgressSpinnerModule } from '@anguless/angulux/progressspinner';

@Component({
    selector: 'agl-progressspinner-custom-doc',
    imports: [ProgressSpinnerModule],
    template: `
        <div class="card">
            <agl-progressSpinner strokeWidth="8" fill="transparent" animationDuration=".5s" [style]="{ width: '50px', height: '50px' }" ariaLabel="loading" />
        </div>
    `
})
export class CustomDoc {}
