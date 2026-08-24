import { Component } from '@angular/core';
import { AvatarGroupModule } from '@anguless/angulux/avatargroup';
import { AvatarModule } from '@anguless/angulux/avatar';

@Component({
    selector: 'agl-avatargroup-basic-doc',
    standalone: true,
    imports: [AvatarGroupModule, AvatarModule],
    template: `
        <div class="card">
            <agl-avatarGroup>
                <agl-avatar label="A" shape="circle" />
                <agl-avatar label="B" shape="circle" />
                <agl-avatar label="C" shape="circle" />
                <agl-avatar label="+2" shape="circle" />
            </agl-avatarGroup>
        </div>
    `
})
export class BasicDoc {}
