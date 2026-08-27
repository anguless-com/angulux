import { Component } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-button-icons-doc',
    imports: [ButtonModule],
    template: `
        <div class="card">
            <agl-button icon="pi pi-home" ariaLabel="Home" />
            <agl-button label="Profile" icon="pi pi-user" />
            <agl-button label="Save" icon="pi pi-check" iconPos="right" />
            <agl-button label="Search" icon="pi pi-search" iconPos="top" />
            <agl-button label="Update" icon="pi pi-refresh" iconPos="bottom" />
        </div>
    `
})
export class IconsDoc {}
