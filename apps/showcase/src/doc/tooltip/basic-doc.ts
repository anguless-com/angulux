import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from '@anguless/angulux/tooltip';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-tooltip-basic-doc',
    imports: [FormsModule, TooltipModule, InputTextModule],
    template: `
        <div class="card">
            <input aglInputText aglTooltip="Enter your username" placeholder="Hover me" />
        </div>
    `
})
export class BasicDoc {}
