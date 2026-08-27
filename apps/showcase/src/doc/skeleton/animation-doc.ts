import { Component } from '@angular/core';
import { SkeletonModule } from '@anguless/angulux/skeleton';

@Component({
    selector: 'agl-skeleton-animation-doc',
    imports: [SkeletonModule],
    template: `
        <div class="card">
            <agl-skeleton width="12rem" />
            <agl-skeleton width="12rem" animation="none" />
        </div>
    `
})
export class AnimationDoc {}
