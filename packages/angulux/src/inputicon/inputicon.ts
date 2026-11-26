import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, InjectionToken, Input, NgModule, ViewEncapsulation } from '@angular/core';
import { SharedModule } from '@anguless/angulux/api';
import { BaseComponent, PARENT_INSTANCE } from '@anguless/angulux/basecomponent';
import { Bind, BindModule } from '@anguless/angulux/bind';
import { InputIconPassThrough } from '@anguless/angulux/types/inputicon';
import { InputIconStyle } from './style/inputiconstyle';

const INPUTICON_INSTANCE = new InjectionToken<InputIcon>('INPUTICON_INSTANCE');

/**
 * InputIcon displays an icon.
 * @group Components
 */
@Component({
    selector: 'agl-inputicon, agl-inputIcon',
    standalone: true,
    imports: [CommonModule, SharedModule, BindModule],
    template: `<ng-content></ng-content>`,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [InputIconStyle, { provide: INPUTICON_INSTANCE, useExisting: InputIcon }, { provide: PARENT_INSTANCE, useExisting: InputIcon }],
    hostDirectives: [Bind],
    host: {
        '[class]': "cn(cx('root'), styleClass)",
        '[attr.aria-hidden]': "decorative ? 'true' : null"
    }
})
export class InputIcon extends BaseComponent<InputIconPassThrough> {
    componentName = 'InputIcon';

    @Input() hostName: any = '';
    /**
     * Style class of the element.
     * @deprecated since v20.0.0, use `class` instead.
     * @group Props
     */
    @Input() styleClass: string | undefined;

    _componentStyle = inject(InputIconStyle);

    $pcInputIcon: InputIcon | undefined = inject(INPUTICON_INSTANCE, { optional: true, skipSelf: true }) ?? undefined;

    bindDirectiveInstance = inject(Bind, { self: true });

    /**
     * Used as `<agl-inputicon class="pi pi-search" />`, the host is the icon: its PrimeIcons glyph is
     * generated content, which a screen reader read out beside the field. Such an InputIcon is
     * decoration and is hidden. One that holds content of its own, an element or text the app put
     * there, is left as it is: what it holds is the app's to name or hide.
     */
    decorative = true;

    onAfterContentChecked(): void {
        const host = this.el?.nativeElement as HTMLElement | undefined;
        this.decorative = !host || !Array.from(host.childNodes).some((node) => node.nodeType === 1 || (node.nodeType === 3 && !!node.textContent?.trim()));
    }

    onAfterViewChecked(): void {
        this.bindDirectiveInstance.setAttrs(this.ptms(['host', 'root']));
    }
}

@NgModule({
    imports: [InputIcon, SharedModule],
    exports: [InputIcon, SharedModule]
})
export class InputIconModule {}
