import { Component, signal } from '@angular/core';
import { FileUploadModule } from '@anguless/angulux/fileupload';

@Component({
    selector: 'agl-fileupload-basic-doc',
    imports: [FileUploadModule],
    template: `
        <div class="card">
            <agl-fileUpload mode="basic" chooseLabel="Choose a file" accept="image/*" [maxFileSize]="1000000" [customUpload]="true" (uploadHandler)="onUpload($event)" />
            <span>{{ chosen() }}</span>
        </div>
    `
})
export class BasicDoc {
    readonly chosen = signal('');

    onUpload(event: { files: File[] }): void {
        this.chosen.set(event.files.map((f) => f.name).join(', '));
    }
}
