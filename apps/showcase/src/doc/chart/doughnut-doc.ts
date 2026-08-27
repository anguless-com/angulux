import { Component } from '@angular/core';
import { ChartModule } from '@anguless/angulux/chart';

@Component({
    selector: 'agl-chart-doughnut-doc',
    imports: [ChartModule],
    template: `
        <div class="card">
            <agl-chart type="doughnut" [data]="data" [options]="options" [style]="{ width: '18rem' }" />
        </div>
    `
})
export class DoughnutDoc {
    data = {
        labels: ['A', 'B', 'C'],
        datasets: [{ data: [300, 50, 100], backgroundColor: ['#3b82f6', '#f59e0b', '#22c55e'] }]
    };

    options = { cutout: '60%' };
}
