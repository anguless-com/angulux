import { Component } from '@angular/core';
import { ProgressSpinnerModule } from '@anguless/angulux/progressspinner';

@Component({
    selector: 'agl-progressspinner-basic-doc',
    standalone: true,
    imports: [ProgressSpinnerModule],
    template: `
        <div class="card">
            <agl-progressSpinner ariaLabel="loading" />
        </div>
    `
})
export class BasicDoc {}
