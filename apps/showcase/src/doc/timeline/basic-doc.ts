import { Component } from '@angular/core';
import { TimelineModule } from '@anguless/angulux/timeline';

@Component({
    selector: 'agl-timeline-basic-doc',
    standalone: true,
    imports: [TimelineModule],
    template: `
        <div class="card">
            <agl-timeline [value]="events" style="width: 100%">
                <ng-template #content let-event>
                    {{ event.status }}
                </ng-template>
            </agl-timeline>
        </div>
    `
})
export class BasicDoc {
    events = [{ status: 'Ordered' }, { status: 'Processing' }, { status: 'Shipped' }, { status: 'Delivered' }];
}
