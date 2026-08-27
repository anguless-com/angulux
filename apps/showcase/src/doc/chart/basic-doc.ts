import { Component } from '@angular/core';
import { ChartModule } from '@anguless/angulux/chart';

@Component({
    selector: 'agl-chart-basic-doc',
    imports: [ChartModule],
    template: `
        <div class="card">
            <agl-chart type="bar" [data]="data" [options]="options" [style]="{ width: '32rem', maxWidth: '100%' }" />
        </div>
    `
})
export class BasicDoc {
    data = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
            { label: 'Sales', data: [540, 325, 702, 620], backgroundColor: '#22c55e' },
            { label: 'Returns', data: [40, 25, 70, 60], backgroundColor: '#ef4444' }
        ]
    };

    options = { maintainAspectRatio: false, aspectRatio: 0.8 };
}
