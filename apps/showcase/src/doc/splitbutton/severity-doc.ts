import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { SplitButtonModule } from '@anguless/angulux/splitbutton';

@Component({
    selector: 'agl-splitbutton-severity-doc',
    imports: [SplitButtonModule],
    template: `
        <div class="card">
            <agl-splitButton label="Save" [model]="items" expandAriaLabel="More actions" />
            <agl-splitButton label="Success" [model]="items" expandAriaLabel="More actions" severity="success" />
            <agl-splitButton label="Warn" [model]="items" expandAriaLabel="More actions" severity="warn" />
            <agl-splitButton label="Danger" [model]="items" expandAriaLabel="More actions" severity="danger" />
        </div>
    `
})
export class SeverityDoc {
    items: MenuItem[] = [{ label: 'Update', icon: 'pi pi-refresh' }, { label: 'Delete', icon: 'pi pi-times' }];
}
