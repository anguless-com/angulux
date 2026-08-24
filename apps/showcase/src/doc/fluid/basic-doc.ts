import { Component } from '@angular/core';
import { FluidModule } from '@anguless/angulux/fluid';
import { InputTextModule } from '@anguless/angulux/inputtext';

@Component({
    selector: 'agl-fluid-basic-doc',
    standalone: true,
    imports: [FluidModule, InputTextModule],
    template: `
        <div class="card">
            <div style="width: 100%; display: grid; gap: 0.75rem">
                <input aglInputText placeholder="Not fluid" />
                <agl-fluid>
                    <input aglInputText placeholder="Fluid fills its container" />
                </agl-fluid>
            </div>
        </div>
    `
})
export class BasicDoc {}
