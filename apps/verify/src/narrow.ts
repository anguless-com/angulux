import { Component, inject } from '@angular/core';
import { MessageService } from '@anguless/angulux/api';
import { FileUploadModule } from '@anguless/angulux/fileupload';
import { ToastModule } from '@anguless/angulux/toast';

/**
 * Components on a narrow screen (WCAG 1.4.10 Reflow: no horizontal scrolling at 320 CSS pixels).
 * e2e/narrow-reflow.spec.ts opens this page at phone widths and requires every part of each
 * component to stay inside the viewport.
 *
 * `?position=` names the toast position, so each one is measured on its own.
 */
@Component({
    selector: 'agl-verify-root',
    imports: [ToastModule, FileUploadModule],
    providers: [MessageService],
    template: `
        <h1>angulux — narrow screens</h1>
        <button id="show-toast" type="button" (click)="show()">Show toast</button>
        <agl-toast [position]="position" />
        <section id="sec-fileupload" style="margin-top: 1rem">
            <agl-fileupload name="files[]" url="/never" [multiple]="true" />
        </section>
    `
})
export class Narrow {
    private readonly messages = inject(MessageService);

    readonly position = positionFrom(new URLSearchParams(location.search).get('position'));

    show(): void {
        this.messages.add({ severity: 'error', summary: 'Could not save the settings', detail: 'The server did not answer in time. Check the connection and press Save again.', sticky: true });
    }
}

type Position = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center' | 'center';

function positionFrom(value: string | null): Position {
    switch (value) {
        case 'top-left':
        case 'top-center':
        case 'bottom-right':
        case 'bottom-left':
        case 'bottom-center':
        case 'center':
            return value;
        default:
            return 'top-right';
    }
}
