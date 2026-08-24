import { Component } from '@angular/core';
import { TooltipModule } from '@anguless/angulux/tooltip';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-tooltip-delay-doc',
    standalone: true,
    imports: [TooltipModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Delayed" aglTooltip="Shown after a second" [showDelay]="1000" [hideDelay]="300" />
        </div>
    `
})
export class DelayDoc {}
