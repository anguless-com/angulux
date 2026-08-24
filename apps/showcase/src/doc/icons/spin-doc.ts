import { Component } from '@angular/core';
import { SpinnerIcon } from '@anguless/angulux/icons/spinner';

@Component({
    selector: 'agl-icons-spin-doc',
    standalone: true,
    imports: [SpinnerIcon],
    template: `
        <div class="card">
            <svg data-p-icon="spinner" [spin]="true" style="width: 1.5rem; height: 1.5rem"></svg>
        </div>
    `
})
export class SpinDoc {}
