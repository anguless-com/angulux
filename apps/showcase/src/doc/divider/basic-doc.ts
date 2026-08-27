import { Component } from '@angular/core';
import { DividerModule } from '@anguless/angulux/divider';

@Component({
    selector: 'agl-divider-basic-doc',
    imports: [DividerModule],
    template: `
        <div class="card">
            <div style="width: 100%">
                <p>Divider separates the items placed around it.</p>
                <agl-divider />
                <p>The default layout is horizontal and the default type is solid.</p>
            </div>
        </div>
    `
})
export class BasicDoc {}
