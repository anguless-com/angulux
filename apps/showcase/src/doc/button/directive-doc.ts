import { Component } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';

@Component({
    selector: 'agl-button-directive-doc',
    standalone: true,
    imports: [ButtonModule],
    template: `
        <div class="card">
            <button aglButton>
                <i class="pi pi-check" aglButtonIcon></i>
                <span aglButtonLabel>Save</span>
            </button>
        </div>
    `
})
export class DirectiveDoc {}
