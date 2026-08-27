import { Component } from '@angular/core';
import { PopoverModule } from '@anguless/angulux/popover';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-popover-basic-doc',
    imports: [PopoverModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Show" (onClick)="op.toggle($event)" />
            <agl-popover #op>
                <p style="margin: 0; max-width: 18rem">A popover is anchored to whatever opened it, and closes when you click away.</p>
            </agl-popover>
        </div>
    `
})
export class BasicDoc {}
