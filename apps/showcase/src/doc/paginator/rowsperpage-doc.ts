import { Component, signal } from '@angular/core';
import { PaginatorModule } from '@anguless/angulux/paginator';

@Component({
    selector: 'agl-paginator-rowsperpage-doc',
    standalone: true,
    imports: [PaginatorModule],
    template: `
        <div class="card">
            <div style="width: 100%">
                <agl-paginator [first]="first()" [rows]="rows()" [totalRecords]="120" [rowsPerPageOptions]="[10, 20, 30]" (onPageChange)="onPage($event)" />
            </div>
        </div>
    `
})
export class RowsPerPageDoc {
    readonly first = signal(0);

    readonly rows = signal(10);

    onPage(event: { first?: number; rows?: number }): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
    }
}
