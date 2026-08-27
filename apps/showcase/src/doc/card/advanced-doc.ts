import { Component } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';
import { CardModule } from '@anguless/angulux/card';

@Component({
    selector: 'agl-card-advanced-doc',
    imports: [ButtonModule, CardModule],
    template: `
        <div class="card card-block">
            <agl-card header="Advanced Card" subheader="With a footer">
                <p>Header, title, subtitle, content and footer are all template slots, so anything that needs markup rather than a string goes in an ng-template.</p>
                <ng-template #footer>
                    <agl-button label="Cancel" severity="secondary" [outlined]="true" />
                    <agl-button label="Save" />
                </ng-template>
            </agl-card>
        </div>
    `
})
export class AdvancedDoc {}
