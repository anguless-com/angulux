import { Component } from '@angular/core';
import { AvatarModule } from '@anguless/angulux/avatar';

@Component({
    selector: 'agl-avatar-sizes-doc',
    imports: [AvatarModule],
    template: `
        <div class="card">
            <agl-avatar label="N" />
            <agl-avatar label="L" size="large" />
            <agl-avatar label="X" size="xlarge" />
        </div>
    `
})
export class SizesDoc {}
