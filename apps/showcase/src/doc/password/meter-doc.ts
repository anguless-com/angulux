import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from '@anguless/angulux/password';

@Component({
    selector: 'agl-password-meter-doc',
    imports: [FormsModule, PasswordModule],
    template: `
        <div class="card">
            <agl-password [(ngModel)]="value" placeholder="Type to see the meter" />
        </div>
    `
})
export class MeterDoc {
    value = '';
}
