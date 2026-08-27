import { Component } from '@angular/core';
import { FileUploadModule } from '@anguless/angulux/fileupload';

@Component({
    selector: 'agl-fileupload-advanced-doc',
    imports: [FileUploadModule],
    template: `
        <div class="card">
            <div style="width: 100%">
                <agl-fileUpload [multiple]="true" accept="image/*" [maxFileSize]="1000000" [customUpload]="true" (uploadHandler)="onUpload($event)">
                    <ng-template #empty>
                        <p>Drag and drop files here to upload.</p>
                    </ng-template>
                </agl-fileUpload>
            </div>
        </div>
    `
})
export class AdvancedDoc {
    onUpload(event: { files: File[] }): void {
        console.log(`${event.files.length} file(s) would be sent here`);
    }
}
