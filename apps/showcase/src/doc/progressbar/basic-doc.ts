import { Component } from '@angular/core';
import { ProgressBarModule } from '@anguless/angulux/progressbar';

@Component({
    selector: 'agl-progressbar-basic-doc',
    imports: [ProgressBarModule],
    template: `
        <div class="card">
            <div style="width: 100%">
                <agl-progressBar [value]="value" aria-label="Upload progress" />
            </div>
        </div>
    `
})
export class BasicDoc {
    value = 60;
}
