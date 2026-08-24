import { Component, signal } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-button-loading-doc',
    standalone: true,
    imports: [ButtonModule],
    template: `
        <div class="card">
            <agl-button label="Search" icon="pi pi-check" [loading]="loading()" (onClick)="load()" />
        </div>
    `
})
export class LoadingDoc {
    readonly loading = signal(false);

    load(): void {
        this.loading.set(true);

        setTimeout(() => this.loading.set(false), 2000);
    }
}
