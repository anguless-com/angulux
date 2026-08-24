import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from '@anguless/angulux/password';

@Component({
    selector: 'agl-password-basic-doc',
    standalone: true,
    imports: [FormsModule, PasswordModule],
    template: `
        <div class="card">
            <agl-password [(ngModel)]="value" [feedback]="false" placeholder="Password" />
        </div>
    `
})
export class BasicDoc {
    value = '';
}
