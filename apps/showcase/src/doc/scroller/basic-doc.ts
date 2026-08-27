import { Component } from '@angular/core';
import { ScrollerModule } from '@anguless/angulux/scroller';

@Component({
    selector: 'agl-scroller-basic-doc',
    imports: [ScrollerModule],
    template: `
        <div class="card">
            <agl-scroller [items]="items" [itemSize]="40" scrollHeight="240px" [style]="{ width: '18rem', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px' }">
                <ng-template #item let-item let-options="options">
                    <div style="height: 40px; display: flex; align-items: center; padding: 0 0.75rem">{{ item }}</div>
                </ng-template>
            </agl-scroller>
        </div>
    `
})
export class BasicDoc {
    items = Array.from({ length: 10000 }, (_, i) => `Item #${i}`);
}
