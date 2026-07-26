import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChild, inject, InjectionToken, Input, NgModule, signal, TemplateRef, ViewEncapsulation } from '@angular/core';
import { equals } from '@anguless/angulux-utils';
import { BlockableUI, SharedModule } from '@anguless/angulux/api';
import { BaseComponent, PARENT_INSTANCE } from '@anguless/angulux/basecomponent';
import { Bind, BindModule } from '@anguless/angulux/bind';
import { CardStyle } from './style/cardstyle';
import { CardPassThrough } from '@anguless/angulux/types/card';

const CARD_INSTANCE = new InjectionToken<Card>('CARD_INSTANCE');

/**
 * Card is a flexible container component.
 * @group Components
 */
@Component({
    selector: 'agl-card',
    standalone: true,
    imports: [CommonModule, BindModule],
    template: `
        <div [aglBind]="ptm('header')" [class]="cx('header')" *ngIf="headerTemplate()">
            <ng-container *ngTemplateOutlet="headerTemplate()"></ng-container>
        </div>
        <div [aglBind]="ptm('body')" [class]="cx('body')">
            <div [aglBind]="ptm('title')" [class]="cx('title')" *ngIf="header || titleTemplate()">
                <ng-container *ngIf="header && !titleTemplate()">{{ header }}</ng-container>
                <ng-container *ngTemplateOutlet="titleTemplate()"></ng-container>
            </div>
            <div [aglBind]="ptm('subtitle')" [class]="cx('subtitle')" *ngIf="subheader || subtitleTemplate()">
                <ng-container *ngIf="subheader && !subtitleTemplate()">{{ subheader }}</ng-container>
                <ng-container *ngTemplateOutlet="subtitleTemplate()"></ng-container>
            </div>
            <div [aglBind]="ptm('content')" [class]="cx('content')">
                <ng-content></ng-content>
                <ng-container *ngTemplateOutlet="contentTemplate()"></ng-container>
            </div>
            <div [aglBind]="ptm('footer')" [class]="cx('footer')" *ngIf="footerTemplate()">
                <ng-container *ngTemplateOutlet="footerTemplate()"></ng-container>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [CardStyle, { provide: CARD_INSTANCE, useExisting: Card }, { provide: PARENT_INSTANCE, useExisting: Card }],
    host: {
        '[class]': "cn(cx('root'), styleClass)",
        '[style]': '_style()'
    },
    hostDirectives: [Bind]
})
export class Card extends BaseComponent<CardPassThrough> implements BlockableUI {
    componentName = 'Card';

    $pcCard: Card | undefined = inject(CARD_INSTANCE, { optional: true, skipSelf: true }) ?? undefined;

    bindDirectiveInstance = inject(Bind, { self: true });

    _componentStyle = inject(CardStyle);

    onAfterViewChecked(): void {
        this.bindDirectiveInstance.setAttrs(this.ptms(['host', 'root']));
    }
    /**
     * Header of the card.
     * @group Props
     */
    @Input() header: string | undefined;
    /**
     * Subheader of the card.
     * @group Props
     */
    @Input() subheader: string | undefined;
    /**
     * Inline style of the element.
     * @group Props
     */
    @Input() set style(value: { [klass: string]: any } | null | undefined) {
        if (!equals(this._style(), value)) {
            this._style.set(value);
            // Apply style directly to avoid infinite loop in host binding
            if (this.el?.nativeElement) {
                if (value) {
                    Object.keys(value).forEach((key) => {
                        this.el.nativeElement.style[key] = value[key];
                    });
                }
            }
        }
    }

    get style() {
        return this._style();
    }
    /**
     * Class of the element.
     * @deprecated since v20.0.0, use `class` instead.
     * @group Props
     */
    @Input() styleClass: string | undefined;

    /**
     * Custom header template.
     * @group Templates
     */
    headerTemplate = contentChild<TemplateRef<void>>('header', { descendants: false });

    /**
     * Custom title template.
     * @group Templates
     */
    titleTemplate = contentChild<TemplateRef<void>>('title', { descendants: false });

    /**
     * Custom subtitle template.
     * @group Templates
     */
    subtitleTemplate = contentChild<TemplateRef<void>>('subtitle', { descendants: false });

    /**
     * Custom content template.
     * @group Templates
     */
    contentTemplate = contentChild<TemplateRef<void>>('content', { descendants: false });

    /**
     * Custom footer template.
     * @group Templates
     */
    footerTemplate = contentChild<TemplateRef<void>>('footer', { descendants: false });

    _style = signal<{ [klass: string]: any } | null | undefined>(null);

    getBlockableElement(): HTMLElement {
        return this.el.nativeElement;
    }
}

@NgModule({
    imports: [Card, SharedModule, BindModule],
    exports: [Card, SharedModule, BindModule]
})
export class CardModule {}
