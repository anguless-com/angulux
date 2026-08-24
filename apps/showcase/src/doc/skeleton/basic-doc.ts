import { Component } from '@angular/core';
import { SkeletonModule } from '@anguless/angulux/skeleton';

@Component({
    selector: 'agl-skeleton-basic-doc',
    standalone: true,
    imports: [SkeletonModule],
    template: `
        <div class="card">
            <div style="width: 100%; display: grid; gap: 0.5rem">
                <agl-skeleton />
                <agl-skeleton width="10rem" />
                <agl-skeleton width="5rem" borderRadius="16px" />
                <agl-skeleton height="2rem" />
            </div>
        </div>
    `
})
export class BasicDoc {}
