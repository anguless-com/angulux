import { Component } from '@angular/core';
import { TooltipModule } from '@anguless/angulux/tooltip';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-tooltip-position-doc',
    standalone: true,
    imports: [TooltipModule, ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Right" aglTooltip="Add" tooltipPosition="right" />
            <agl-button label="Top" aglTooltip="Add" tooltipPosition="top" />
            <agl-button label="Bottom" aglTooltip="Add" tooltipPosition="bottom" />
            <agl-button label="Left" aglTooltip="Add" tooltipPosition="left" />
        </div>
    `
})
export class PositionDoc {}
