import { Component } from '@angular/core';
import { ProgressBarModule } from '@anguless/angulux/progressbar';

@Component({
    selector: 'agl-progressbar-indeterminate-doc',
    imports: [ProgressBarModule],
    template: `
        <div class="card">
            <div style="width: 100%">
                <agl-progressBar mode="indeterminate" [style]="{ height: '6px' }" />
            </div>
        </div>
    `
})
export class IndeterminateDoc {}
