import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { MenuItem } from 'primeng/api';

@Component({
    selector: 'demo-root',
    imports: [ButtonModule, TableModule],
    template: `
        <p-button label="Save"></p-button>
        <button pButton pTooltip="hint">Inline</button>
    `,
    styles: [
        // A CSS class, NOT a selector. It must survive migration untouched: the fork keeps
        // .p-* class names so themes and custom styling keep working.
        `.p-button { border-radius: 4px; }`
    ]
})
export class DemoComponent {
    items: MenuItem[] = [];
}
