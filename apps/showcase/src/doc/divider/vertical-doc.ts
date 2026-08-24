import { Component } from '@angular/core';
import { DividerModule } from '@anguless/angulux/divider';

@Component({
    selector: 'agl-divider-vertical-doc',
    standalone: true,
    imports: [DividerModule],
    template: `
        <div class="card">
            <div style="display: flex; align-items: center; height: 6rem">
                <p>Left</p>
                <agl-divider layout="vertical" />
                <p>Right</p>
            </div>
        </div>
    `
})
export class VerticalDoc {}
