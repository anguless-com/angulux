import { Component } from '@angular/core';
import { TagModule } from '@anguless/angulux/tag';

@Component({
    selector: 'agl-tag-icons-doc',
    standalone: true,
    imports: [TagModule],
    template: `
        <div class="card">
            <agl-tag icon="pi pi-user" value="Primary" />
            <agl-tag icon="pi pi-check" severity="success" value="Success" />
            <agl-tag icon="pi pi-times" severity="danger" value="Danger" />
        </div>
    `
})
export class IconsDoc {}
