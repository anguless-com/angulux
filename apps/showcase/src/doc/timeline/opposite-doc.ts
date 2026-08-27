import { Component } from '@angular/core';
import { TimelineModule } from '@anguless/angulux/timeline';

@Component({
    selector: 'agl-timeline-opposite-doc',
    imports: [TimelineModule],
    template: `
        <div class="card">
            <agl-timeline [value]="events" align="alternate" style="width: 100%">
                <ng-template #content let-event>
                    {{ event.status }}
                </ng-template>
                <ng-template #opposite let-event>
                    <small>{{ event.date }}</small>
                </ng-template>
            </agl-timeline>
        </div>
    `
})
export class OppositeDoc {
    events = [
        { status: 'Ordered', date: '15/10/2026 10:30' },
        { status: 'Processing', date: '15/10/2026 14:00' },
        { status: 'Shipped', date: '16/10/2026 09:45' },
        { status: 'Delivered', date: '17/10/2026 08:15' }
    ];
}
