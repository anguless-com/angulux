import { Component } from '@angular/core';
import { ScrollerModule } from '@anguless/angulux/scroller';

@Component({
    selector: 'agl-scroller-horizontal-doc',
    standalone: true,
    imports: [ScrollerModule],
    template: `
        <div class="card">
            <agl-scroller [items]="items" [itemSize]="80" orientation="horizontal" [style]="{ width: '20rem', height: '4rem', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px' }">
                <ng-template #item let-item>
                    <div style="width: 80px; height: 100%; display: flex; align-items: center; justify-content: center">{{ item }}</div>
                </ng-template>
            </agl-scroller>
        </div>
    `
})
export class HorizontalDoc {
    items = Array.from({ length: 1000 }, (_, i) => `#${i}`);
}
