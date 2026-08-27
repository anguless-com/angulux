import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { SplitButtonModule } from '@anguless/angulux/splitbutton';

@Component({
    selector: 'agl-splitbutton-basic-doc',
    imports: [SplitButtonModule],
    template: `
        <div class="card">
            <agl-splitButton label="Save" [model]="items" />
        </div>
    `
})
export class BasicDoc {
    items: MenuItem[] = [{ label: 'Update', icon: 'pi pi-refresh' }, { label: 'Delete', icon: 'pi pi-times' }];
}
