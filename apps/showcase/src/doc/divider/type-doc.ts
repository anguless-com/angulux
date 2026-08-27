import { Component } from '@angular/core';
import { DividerModule } from '@anguless/angulux/divider';

@Component({
    selector: 'agl-divider-type-doc',
    imports: [DividerModule],
    template: `
        <div class="card">
            <div style="width: 100%">
                <p>Solid</p>
                <agl-divider />
                <p>Dashed</p>
                <agl-divider type="dashed" />
                <p>Dotted</p>
                <agl-divider type="dotted" />
            </div>
        </div>
    `
})
export class TypeDoc {}
