import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { SplitButtonModule } from '@anguless/angulux/splitbutton';

@Component({
    selector: 'agl-splitbutton-severity-doc',
    standalone: true,
    imports: [SplitButtonModule],
    template: `
        <div class="card">
            <agl-splitButton label="Save" [model]="items" />
            <agl-splitButton label="Success" [model]="items" severity="success" />
            <agl-splitButton label="Warn" [model]="items" severity="warn" />
            <agl-splitButton label="Danger" [model]="items" severity="danger" />
        </div>
    `
})
export class SeverityDoc {
    items: MenuItem[] = [{ label: 'Update', icon: 'pi pi-refresh' }, { label: 'Delete', icon: 'pi pi-times' }];
}
