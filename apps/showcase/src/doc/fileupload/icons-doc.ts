import { Component } from '@angular/core';
import { FileUploadModule } from '@anguless/angulux/fileupload';

@Component({
    selector: 'agl-fileupload-icons-doc',
    imports: [FileUploadModule],
    template: `
        <div class="card">
            <agl-fileUpload mode="basic" chooseLabel="Choose an image" chooseIcon="pi pi-image" uploadIcon="pi pi-cloud-upload" accept="image/*" [maxFileSize]="1000000" [customUpload]="true" (uploadHandler)="onUpload($event)" />
            <div style="width: 100%; margin-top: 1.5rem">
                <agl-fileUpload [multiple]="true" chooseIcon="pi pi-images" uploadIcon="pi pi-cloud-upload" cancelIcon="pi pi-ban" accept="image/*" [maxFileSize]="1000000" [customUpload]="true" (uploadHandler)="onUpload($event)" />
            </div>
        </div>
    `
})
export class IconsDoc {
    onUpload(event: { files: File[] }): void {
        console.log(`${event.files.length} file(s) would be sent here`);
    }
}
