import { Component } from '@angular/core';
import { SkeletonModule } from '@anguless/angulux/skeleton';

@Component({
    selector: 'agl-skeleton-shapes-doc',
    imports: [SkeletonModule],
    template: `
        <div class="card">
            <agl-skeleton shape="circle" size="4rem" />
            <agl-skeleton width="10rem" height="4rem" />
            <agl-skeleton width="10rem" height="4rem" borderRadius="16px" />
        </div>
    `
})
export class ShapesDoc {}
