import { Component } from '@angular/core';
import { RippleModule } from '@anguless/angulux/ripple';

@Component({
    selector: 'agl-ripple-basic-doc',
    imports: [RippleModule],
    template: `
        <div class="card">
            <div
                aglRipple
                style="padding: 2rem; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; cursor: pointer; user-select: none"
            >
                Click me
            </div>
        </div>
    `
})
export class BasicDoc {}
