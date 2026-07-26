import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChild, inject, InjectionToken, Input, NgModule, TemplateRef, ViewEncapsulation } from '@angular/core';
import { BlockableUI, SharedModule } from '@anguless/angulux/api';
import { BaseComponent, PARENT_INSTANCE } from '@anguless/angulux/basecomponent';
import { Bind } from '@anguless/angulux/bind';
import { Nullable } from '@anguless/angulux/ts-helpers';
import { TimelineItemTemplateContext, TimelinePassThrough } from '@anguless/angulux/types/timeline';
import { TimelineStyle } from './style/timelinestyle';

const TIMELINE_INSTANCE = new InjectionToken<Timeline>('TIMELINE_INSTANCE');

/**
 * Timeline visualizes a series of chained events.
 * @group Components
 */
@Component({
    selector: 'agl-timeline',
    standalone: true,
    imports: [CommonModule, SharedModule, Bind],
    template: `
        <div [aglBind]="ptm('event')" *ngFor="let event of value; let last = last" [class]="cx('event')" [attr.data-p]="dataP">
            <div [aglBind]="ptm('eventOpposite')" [class]="cx('eventOpposite')" [attr.data-p]="dataP">
                <ng-container *ngTemplateOutlet="oppositeTemplate(); context: { $implicit: event }"></ng-container>
            </div>
            <div [aglBind]="ptm('eventSeparator')" [class]="cx('eventSeparator')" [attr.data-p]="dataP">
                <ng-container *ngIf="markerTemplate(); else marker">
                    <ng-container *ngTemplateOutlet="markerTemplate(); context: { $implicit: event }"></ng-container>
                </ng-container>
                <ng-template #marker>
                    <div [aglBind]="ptm('eventMarker')" [class]="cx('eventMarker')" [attr.data-p]="dataP"></div>
                </ng-template>
                <div [aglBind]="ptm('eventConnector')" *ngIf="!last" [class]="cx('eventConnector')" [attr.data-p]="dataP"></div>
            </div>
            <div [aglBind]="ptm('eventContent')" [class]="cx('eventContent')" [attr.data-p]="dataP">
                <ng-container *ngTemplateOutlet="contentTemplate(); context: { $implicit: event }"></ng-container>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [TimelineStyle, { provide: TIMELINE_INSTANCE, useExisting: Timeline }, { provide: PARENT_INSTANCE, useExisting: Timeline }],
    host: {
        '[class]': "cn(cx('root'), styleClass)",
        '[attr.data-p]': 'dataP'
    },
    hostDirectives: [Bind]
})
export class Timeline extends BaseComponent<TimelinePassThrough> implements BlockableUI {
    componentName = 'Timeline';

    bindDirectiveInstance = inject(Bind, { self: true });

    $pcTimeline: Timeline | undefined = inject(TIMELINE_INSTANCE, { optional: true, skipSelf: true }) ?? undefined;

    onAfterViewChecked(): void {
        this.bindDirectiveInstance.setAttrs(this.ptms(['host', 'root']));
    }
    /**
     * An array of events to display.
     * @group Props
     */
    @Input() value: any[] | undefined;
    /**
     * Style class of the component.
     * @deprecated since v20.0.0, use `class` instead.
     * @group Props
     */
    @Input() styleClass: string | undefined;
    /**
     * Position of the timeline bar relative to the content. Valid values are "left", "right" for vertical layout and "top", "bottom" for horizontal layout.
     * @group Props
     */
    @Input() align: string = 'left';
    /**
     * Orientation of the timeline.
     * @group Props
     */
    @Input() layout: 'vertical' | 'horizontal' = 'vertical';
    /**
     * Custom content template.
     * @param {TimelineItemTemplateContext} context - item context.
     * @see {@link TimelineItemTemplateContext}
     * @group Templates
     */
    contentTemplate = contentChild<TemplateRef<TimelineItemTemplateContext>>('content', { descendants: false });

    /**
     * Custom opposite item template.
     * @param {TimelineItemTemplateContext} context - item context.
     * @see {@link TimelineItemTemplateContext}
     * @group Templates
     */
    oppositeTemplate = contentChild<TemplateRef<TimelineItemTemplateContext>>('opposite', { descendants: false });

    /**
     * Custom marker template.
     * @param {TimelineItemTemplateContext} context - item context.
     * @see {@link TimelineItemTemplateContext}
     * @group Templates
     */
    markerTemplate = contentChild<TemplateRef<TimelineItemTemplateContext>>('marker', { descendants: false });



    _componentStyle = inject(TimelineStyle);

    getBlockableElement(): HTMLElement {
        return this.el.nativeElement.children[0];
    }

    get dataP() {
        return this.cn({
            [this.layout]: this.layout,
            [this.align]: this.align
        });
    }
}

@NgModule({
    imports: [Timeline, SharedModule],
    exports: [Timeline, SharedModule]
})
export class TimelineModule {}
