import { Component } from '@angular/core';
import { AvatarModule } from '@anguless/angulux/avatar';

@Component({
    selector: 'agl-avatar-shape-doc',
    standalone: true,
    imports: [AvatarModule],
    template: `
        <div class="card">
            <agl-avatar label="S" shape="square" />
            <agl-avatar label="C" shape="circle" />
        </div>
    `
})
export class ShapeDoc {}
