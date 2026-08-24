import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { SplitButtonModule } from '@anguless/angulux/splitbutton';

@Component({
    selector: 'agl-splitbutton-outlined-doc',
    standalone: true,
    imports: [SplitButtonModule],
    template: `
        <div class="card">
            <agl-splitButton label="Outlined" [model]="items" [outlined]="true" />
            <agl-splitButton label="Text" [model]="items" [text]="true" />
            <agl-splitButton label="Raised" [model]="items" [raised]="true" />
        </div>
    `
})
export class OutlinedDoc {
    items: MenuItem[] = [{ label: 'Update', icon: 'pi pi-refresh' }, { label: 'Delete', icon: 'pi pi-times' }];
}
