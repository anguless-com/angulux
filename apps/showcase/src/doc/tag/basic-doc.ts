import { Component } from '@angular/core';
import { TagModule } from '@anguless/angulux/tag';

@Component({
    selector: 'agl-tag-basic-doc',
    imports: [TagModule],
    template: `
        <div class="card">
            <agl-tag value="New" />
        </div>
    `
})
export class BasicDoc {}
