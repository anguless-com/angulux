import { Component } from '@angular/core';
import { TagModule } from '@anguless/angulux/tag';

@Component({
    selector: 'agl-tag-rounded-doc',
    imports: [TagModule],
    template: `
        <div class="card">
            <agl-tag value="Primary" [rounded]="true" />
            <agl-tag severity="success" value="Success" [rounded]="true" />
            <agl-tag severity="danger" value="Danger" [rounded]="true" />
        </div>
    `
})
export class RoundedDoc {}
