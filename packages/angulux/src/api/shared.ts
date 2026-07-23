import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Directive, Input, NgModule, TemplateRef } from '@angular/core';

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'agl-header',
    template: '<ng-content></ng-content>',
    standalone: false
})
export class Header {}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'agl-footer',
    template: '<ng-content></ng-content>',
    standalone: false
})
export class Footer {}

@Directive({
    selector: '[aglTemplate]',
    standalone: true
})
export class AglTemplate {
    @Input() type: string | undefined;

    @Input('aglTemplate') name: string | undefined;

    constructor(public template: TemplateRef<any>) {}

    getType(): string {
        return this.name!;
    }
}

@NgModule({
    imports: [CommonModule, AglTemplate],
    exports: [Header, Footer, AglTemplate],
    declarations: [Header, Footer]
})
export class SharedModule {}
