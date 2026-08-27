import { Component } from '@angular/core';
import { ProgressSpinnerModule } from '@anguless/angulux/progressspinner';

@Component({
    selector: 'agl-progressspinner-basic-doc',
    imports: [ProgressSpinnerModule],
    template: `
        <div class="card">
            <agl-progressSpinner ariaLabel="loading" />
        </div>
    `
})
export class BasicDoc {}
