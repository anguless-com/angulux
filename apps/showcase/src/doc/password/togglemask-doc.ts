import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from '@anguless/angulux/password';

@Component({
    selector: 'agl-password-togglemask-doc',
    imports: [FormsModule, PasswordModule],
    template: `
        <div class="card">
            <agl-password [(ngModel)]="value" [toggleMask]="true" placeholder="Password" />
        </div>
    `
})
export class ToggleMaskDoc {
    value = '';
}
