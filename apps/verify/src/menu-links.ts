import { Component } from '@angular/core';
import { MenuItem } from '@anguless/angulux/api';
import { MenuModule } from '@anguless/angulux/menu';
import { TieredMenuModule } from '@anguless/angulux/tieredmenu';

/**
 * Menu items that are plain links (`url`), with and without a `target`.
 * e2e/menu-links.spec.ts requires a link without a target to open in the tab it is in.
 */
@Component({
    selector: 'agl-verify-root',
    imports: [MenuModule, TieredMenuModule],
    template: `
        <h1>angulux — menu links</h1>
        <section style="display: flex; gap: 2rem; margin: 2rem">
            <agl-menu id="links-menu" [model]="items" />
            <agl-tieredmenu id="links-tiered" [model]="items" />
        </section>
    `
})
export class MenuLinks {
    readonly items: MenuItem[] = [
        { label: 'Same tab', url: '#same-tab' },
        { label: 'New tab', url: '#new-tab', target: '_blank' }
    ];
}
