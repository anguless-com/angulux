import { Component } from '@angular/core';
import { TabsModule } from '@anguless/angulux/tabs';

@Component({
    selector: 'agl-tabs-scrollable-doc',
    standalone: true,
    imports: [TabsModule],
    template: `
        <div class="card card-block">
            <agl-tabs value="0" [scrollable]="true">
                <agl-tablist>
                    @for (tab of tabs; track tab) {
                        <agl-tab [value]="tab">Header {{ tab }}</agl-tab>
                    }
                </agl-tablist>
                <agl-tabpanels>
                    @for (tab of tabs; track tab) {
                        <agl-tabpanel [value]="tab">
                            <p>Content of tab {{ tab }}.</p>
                        </agl-tabpanel>
                    }
                </agl-tabpanels>
            </agl-tabs>
        </div>
    `
})
export class ScrollableDoc {
    tabs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
}
