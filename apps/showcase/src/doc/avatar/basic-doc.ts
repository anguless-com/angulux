import { Component } from '@angular/core';
import { AvatarModule } from '@anguless/angulux/avatar';

@Component({
    selector: 'agl-avatar-basic-doc',
    imports: [AvatarModule],
    template: `
        <div class="card">
            <agl-avatar label="P" />
            <agl-avatar icon="pi pi-user" />
        </div>
    `
})
export class BasicDoc {}
