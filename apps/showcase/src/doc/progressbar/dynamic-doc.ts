import { Component, signal } from '@angular/core';
import { ProgressBarModule } from '@anguless/angulux/progressbar';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-progressbar-dynamic-doc',
    standalone: true,
    imports: [ProgressBarModule, ButtonModule],
    template: `
        <div class="card">
            <div style="width: 100%; display: grid; gap: 0.75rem; justify-items: center">
                <agl-progressBar [value]="value()" />
                <agl-button label="Advance" (onClick)="advance()" />
            </div>
        </div>
    `
})
export class DynamicDoc {
    readonly value = signal(20);

    advance(): void {
        this.value.update((v) => (v >= 100 ? 0 : v + 20));
    }
}
