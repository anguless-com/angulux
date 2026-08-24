import { Component } from '@angular/core';
import { TabsModule } from '@anguless/angulux/tabs';

@Component({
    selector: 'agl-tabs-basic-doc',
    standalone: true,
    imports: [TabsModule],
    template: `
        <div class="card card-block">
            <agl-tabs value="0">
                <agl-tablist>
                    <agl-tab value="0">Header I</agl-tab>
                    <agl-tab value="1">Header II</agl-tab>
                    <agl-tab value="2">Header III</agl-tab>
                </agl-tablist>
                <agl-tabpanels>
                    <agl-tabpanel value="0">
                        <p>Tabs is composed of four pieces: Tabs, TabList, TabPanels and TabPanel. A Tab and its TabPanel are paired by their value.</p>
                    </agl-tabpanel>
                    <agl-tabpanel value="1">
                        <p>Only the selected panel is in the DOM when lazy is set; otherwise every panel renders and the inactive ones are hidden.</p>
                    </agl-tabpanel>
                    <agl-tabpanel value="2">
                        <p>The value can be any string, and it is what you bind to in order to control the selection from outside.</p>
                    </agl-tabpanel>
                </agl-tabpanels>
            </agl-tabs>
        </div>
    `
})
export class BasicDoc {}
