import { Component } from '@angular/core';
import { CardModule } from '@anguless/angulux/card';

@Component({
    selector: 'agl-card-basic-doc',
    standalone: true,
    imports: [CardModule],
    template: `
        <div class="card card-block">
            <agl-card header="Simple Card">
                <p>A card groups related content and actions behind one surface. The header comes from the header property; everything else is projected as children.</p>
            </agl-card>
        </div>
    `
})
export class BasicDoc {}
