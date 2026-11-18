import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem, MessageService } from '@anguless/angulux/api';
import { BadgeModule } from '@anguless/angulux/badge';
import { ButtonModule } from '@anguless/angulux/button';
import { MessageModule } from '@anguless/angulux/message';
import { ProgressBarModule } from '@anguless/angulux/progressbar';
import { SelectButtonModule } from '@anguless/angulux/selectbutton';
import { SplitButtonModule } from '@anguless/angulux/splitbutton';
import { TabsModule } from '@anguless/angulux/tabs';
import { TagModule } from '@anguless/angulux/tag';
import { ToastModule } from '@anguless/angulux/toast';
import { ToggleButtonModule } from '@anguless/angulux/togglebutton';

/**
 * Every component that carries a severity colour, in every severity, for a contrast sweep (WCAG
 * 1.4.3). e2e/contrast.spec.ts reads each text node here against the background painted behind it.
 *
 * `?preset=` names the preset (main.ts). `?under=` names what the components sit on: `content` is
 * the surface a card, dialog or panel paints, `ground` is a page canvas behind them. It matters
 * because several dark fills are translucent, so their contrast depends on what is underneath.
 */
@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, BadgeModule, ButtonModule, MessageModule, ProgressBarModule, SelectButtonModule, SplitButtonModule, TabsModule, TagModule, ToastModule, ToggleButtonModule],
    providers: [MessageService],
    styles: `
        main {
            position: fixed;
            inset: 0;
            overflow: auto;
            padding: 1.5rem;
        }
        main.content {
            background: var(--p-content-background);
        }
        main.ground {
            background: var(--p-surface-50);
        }
        @media (prefers-color-scheme: dark) {
            main.ground {
                background: var(--p-surface-950);
            }
        }
        .row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
            margin-bottom: 1rem;
            max-width: 48rem;
        }
    `,
    template: `
        <main [class]="under">
            <button id="show-toasts" type="button" (click)="showToasts()">Show toasts</button>
            <agl-toast />

            <div class="row" id="buttons">
                @for (s of buttonSeverities; track s) {
                    <agl-button [label]="s ?? 'primary'" [severity]="s" />
                }
            </div>
            <div class="row" id="buttons-outlined">
                @for (s of buttonSeverities; track s) {
                    <agl-button [label]="s ?? 'primary'" [severity]="s" variant="outlined" />
                }
            </div>
            <div class="row" id="buttons-text">
                @for (s of buttonSeverities; track s) {
                    <agl-button [label]="s ?? 'primary'" [severity]="s" variant="text" />
                }
            </div>
            <div class="row" id="splitbuttons">
                <agl-splitButton label="Save" [model]="items" />
                <agl-splitButton label="Success" [model]="items" severity="success" />
                <agl-splitButton label="Warn" [model]="items" severity="warn" />
                <agl-splitButton label="Danger" [model]="items" severity="danger" />
                <agl-splitButton label="Outlined" [model]="items" [outlined]="true" />
            </div>
            <div class="row" id="badges">
                <agl-badge value="2" />
                <agl-badge value="4" severity="secondary" />
                <agl-badge value="6" severity="success" />
                <agl-badge value="8" severity="info" />
                <agl-badge value="9" severity="warn" />
                <agl-badge value="3" severity="danger" />
                <agl-badge value="5" severity="contrast" />
            </div>
            <div class="row" id="tags">
                <agl-tag value="Primary" />
                <agl-tag severity="secondary" value="Secondary" />
                <agl-tag severity="success" value="Success" />
                <agl-tag severity="info" value="Info" />
                <agl-tag severity="warn" value="Warn" />
                <agl-tag severity="danger" value="Danger" />
                <agl-tag severity="contrast" value="Contrast" />
            </div>
            @for (variant of messageVariants; track variant) {
                <div class="row" [id]="'messages-' + (variant ?? 'filled')">
                    @for (s of messageSeverities; track s) {
                        <agl-message [severity]="s" [variant]="variant">{{ s }} message</agl-message>
                    }
                </div>
            }
            <div class="row" id="toggles">
                <agl-toggleButton [(ngModel)]="checked" onLabel="Yes" offLabel="No" />
                <agl-selectButton [(ngModel)]="choice" [options]="options" optionLabel="label" optionValue="value" />
            </div>
            <div class="row" id="progress">
                <div style="width: 20rem">
                    <agl-progressBar [value]="60" />
                </div>
            </div>
            <div class="row" id="tabs">
                <agl-tabs value="0">
                    <agl-tablist>
                        <agl-tab value="0">Selected tab</agl-tab>
                        <agl-tab value="1">Other tab</agl-tab>
                    </agl-tablist>
                    <agl-tabpanels>
                        <agl-tabpanel value="0"><p>Panel text.</p></agl-tabpanel>
                        <agl-tabpanel value="1"><p>Other panel text.</p></agl-tabpanel>
                    </agl-tabpanels>
                </agl-tabs>
            </div>
        </main>
    `
})
export class Contrast {
    private readonly messages = inject(MessageService);

    readonly under = underFrom(new URLSearchParams(location.search).get('under'));

    readonly buttonSeverities = [undefined, 'secondary', 'success', 'info', 'warn', 'help', 'danger', 'contrast'] as const;
    readonly messageSeverities = ['success', 'info', 'warn', 'error', 'secondary', 'contrast'] as const;
    readonly messageVariants = [undefined, 'outlined', 'simple'] as const;

    readonly items: MenuItem[] = [{ label: 'Update' }, { label: 'Delete' }];
    readonly options = [
        { label: 'Off', value: 'off' },
        { label: 'On', value: 'on' }
    ];

    checked = false;
    choice = 'off';

    showToasts(): void {
        for (const severity of this.messageSeverities) {
            this.messages.add({ severity, summary: `${severity} summary`, detail: `${severity} detail`, sticky: true });
        }
    }
}

function underFrom(value: string | null): 'content' | 'ground' {
    // Each case returns its own literal, so no text from the address bar reaches the template.
    return value === 'ground' ? 'ground' : 'content';
}
