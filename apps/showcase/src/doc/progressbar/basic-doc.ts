import { Component } from '@angular/core';
import { ProgressBarModule } from '@anguless/angulux/progressbar';

@Component({
    selector: 'agl-progressbar-basic-doc',
    imports: [ProgressBarModule],
    template: `
        <div class="card">
            <div style="width: 100%">
                <agl-progressBar [value]="value" />
            </div>
        </div>
    `
})
export class BasicDoc {
    value = 60;
}
