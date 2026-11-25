import { Component, signal } from '@angular/core';
import { ButtonModule } from '@anguless/angulux/button';
import { FocusTrapModule } from '@anguless/angulux/focustrap';
import { InputTextModule } from '@anguless/angulux/inputtext';

/**
 * A focus trap between two ordinary buttons. e2e/focus-trap.spec.ts drives it with the real Tab
 * key: where Tab goes next is the browser's decision, so the trap can only be proved in one.
 *
 * The last button turns the trap off and on again, through its `aglFocusTrapDisabled` input.
 */
@Component({
    selector: 'agl-verify-root',
    imports: [ButtonModule, FocusTrapModule, InputTextModule],
    template: `
        <h1>angulux — focus trap</h1>
        <button id="before" type="button">Before the trap</button>
        <div id="trap" aglFocusTrap [aglFocusTrapDisabled]="disabled()" style="display: flex; gap: 0.75rem; margin: 1rem 0">
            <input id="first" aglInputText aria-label="First" />
            <input id="second" aglInputText aria-label="Second" />
            <agl-button id="submit" label="Submit" />
        </div>
        <button id="after" type="button">After the trap</button>
        <button id="toggle" type="button" (click)="disabled.set(!disabled())">{{ disabled() ? 'Turn the trap on' : 'Turn the trap off' }}</button>
    `
})
export class FocusTrapPage {
    readonly disabled = signal(false);
}
