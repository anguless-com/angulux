import { isPlatformBrowser } from '@angular/common';
import { booleanAttribute, computed, Directive, effect, ElementRef, inject, InjectionToken, input, Input, NgModule, NgZone, numberAttribute, SimpleChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { appendChild, createElement, findSingle, getFocusableElements, getOuterHeight, getOuterWidth, getViewport, getWindowScrollLeft, getWindowScrollTop, hasClass, removeChild, uuid } from '@anguless/angulux-utils';
import { TooltipOptions } from '@anguless/angulux/api';
import { BaseComponent } from '@anguless/angulux/basecomponent';
import { BindModule } from '@anguless/angulux/bind';
import { ConnectedOverlayScrollHandler } from '@anguless/angulux/dom';
import { Nullable } from '@anguless/angulux/ts-helpers';
import { TooltipPassThroughOptions } from '@anguless/angulux/types/tooltip';
import { ZIndexUtils } from '@anguless/angulux/utils';
import { TooltipStyle } from './style/tooltipstyle';
import type { TooltipPassThrough } from '@anguless/angulux/types/tooltip';

const TOOLTIP_INSTANCE = new InjectionToken<Tooltip>('TOOLTIP_INSTANCE');

/** The options a tooltip starts with. An option set to `undefined` goes back to its value here. */
const TOOLTIP_DEFAULTS = {
    tooltipLabel: null,
    tooltipPosition: 'right',
    tooltipEvent: 'hover',
    appendTo: 'body',
    positionStyle: null,
    tooltipStyleClass: null,
    tooltipZIndex: 'auto',
    escape: true,
    disabled: null,
    showDelay: null,
    hideDelay: null,
    positionTop: null,
    positionLeft: null,
    life: null,
    autoHide: true,
    hideOnEscape: true,
    showOnEllipsis: false
};

/** Length of the fade-in, in milliseconds. */
const FADE_DURATION = 250;

/** Whether the user asked the system to reduce motion. */
function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Tooltip directive provides advisory information for a component.
 * @group Components
 */
@Directive({
    selector: '[aglTooltip]',
    standalone: true,
    // No PARENT_INSTANCE here. A directive on a component host that provided it would stand in for
    // that component as the parent of everything inside it: an InputIcon in an IconField carrying
    // a tooltip found the Tooltip as its parent instead of the IconField (upstream 22.1.5, measured
    // 2026-11-17 in e2e/upstream-repro-22-1-5.spec.ts).
    providers: [TooltipStyle, { provide: TOOLTIP_INSTANCE, useExisting: Tooltip }]
})
export class Tooltip extends BaseComponent<TooltipPassThroughOptions> {
    componentName = 'Tooltip';

    $pcTooltip: Tooltip | undefined = inject(TOOLTIP_INSTANCE, { optional: true, skipSelf: true }) ?? undefined;

    /**
     * Position of the tooltip.
     * @group Props
     */
    @Input() tooltipPosition: 'right' | 'left' | 'top' | 'bottom' | string | undefined;
    /**
     * Event to show the tooltip.
     * @group Props
     */
    @Input() tooltipEvent: 'hover' | 'focus' | 'both' = 'hover';
    /**
     * Type of CSS position.
     * @group Props
     */
    @Input() positionStyle: string | undefined;
    /**
     * Style class of the tooltip.
     * @group Props
     */
    @Input() tooltipStyleClass: string | undefined;
    /**
     * Whether the z-index should be managed automatically to always go on top or have a fixed value.
     * @group Props
     */
    @Input() tooltipZIndex: string | undefined;
    /**
     * By default the tooltip contents are rendered as text. Set to false to support html tags in the content.
     * @group Props
     */
    @Input({ transform: booleanAttribute }) escape: boolean = true;
    /**
     * Delay to show the tooltip in milliseconds.
     * @group Props
     */
    @Input({ transform: numberAttribute }) showDelay: number | undefined;
    /**
     * Delay to hide the tooltip in milliseconds.
     * @group Props
     */
    @Input({ transform: numberAttribute }) hideDelay: number | undefined;
    /**
     * Time to wait in milliseconds to hide the tooltip even it is active.
     * @group Props
     */
    @Input({ transform: numberAttribute }) life: number | undefined;
    /**
     * Specifies the additional vertical offset of the tooltip from its default position.
     * @group Props
     */
    @Input({ transform: numberAttribute }) positionTop: number | undefined;
    /**
     * Specifies the additional horizontal offset of the tooltip from its default position.
     * @group Props
     */
    @Input({ transform: numberAttribute }) positionLeft: number | undefined;
    /**
     * Whether to hide tooltip when hovering over tooltip content.
     * @group Props
     */
    @Input({ transform: booleanAttribute }) autoHide: boolean = true;
    /**
     * Automatically adjusts the element position when there is not enough space on the selected position.
     * @group Props
     */
    @Input({ transform: booleanAttribute }) fitContent: boolean = true;
    /**
     * Whether to hide tooltip on escape key press.
     * @group Props
     */
    @Input({ transform: booleanAttribute }) hideOnEscape: boolean = true;
    /**
     * Whether to show the tooltip only when the target text overflows (e.g., ellipsis is active).
     * @group Props
     */
    @Input({ transform: booleanAttribute }) showOnEllipsis: boolean = false;
    /**
     * Content of the tooltip.
     * @group Props
     */
    @Input('aglTooltip') content: string | TemplateRef<HTMLElement> | undefined;
    /**
     * When present, it specifies that the component should be disabled.
     * @defaultValue false
     * @group Props
     */
    @Input('tooltipDisabled') get disabled(): boolean {
        return this._disabled as boolean;
    }
    set disabled(val: boolean) {
        this._disabled = val;
        this.deactivate();
    }
    /**
     * Specifies the tooltip configuration options for the component.
     * @group Props
     */
    @Input() tooltipOptions: TooltipOptions | undefined;
    /**
     * Target element to attach the overlay, valid values are "body" or a local ng-template variable of another element (note: use binding with brackets for template variables, e.g. [appendTo]="mydiv" for a div element having #mydiv as variable name).
     * @defaultValue 'self'
     * @group Props
     */
    appendTo = input<HTMLElement | ElementRef | TemplateRef<any> | 'self' | 'body' | null | undefined | any>(undefined);

    $appendTo = computed(() => this.appendTo() || this.config.overlayAppendTo());

    _tooltipOptions: typeof TOOLTIP_DEFAULTS & { id: string } = {
        ...TOOLTIP_DEFAULTS,
        id: uuid('pn_id_') + '_tooltip'
    };

    /** The element `aria-describedby` was set on while the tooltip shows, so hiding can take it off. */
    private describedElement: HTMLElement | null = null;

    /** The pending frame of the fade-in, cancelled when the tooltip is removed. */
    private fadeFrame: number | null = null;

    /** The pending wait for a dialog's opening animation, so a tooltip removed meanwhile is not shown. */
    private showToken = 0;

    private targetKeydownListener: Nullable<() => void>;

    private containerKeydownListener: Nullable<() => void>;

    private containerFocusoutListener: Nullable<() => void>;

    _disabled: boolean | undefined;

    container: any;

    styleClass: string | undefined;

    tooltipText: any;

    rootPTClasses: string = '';

    showTimeout: any;

    hideTimeout: any;

    active: boolean | undefined;

    mouseEnterListener: Nullable<Function>;

    mouseLeaveListener: Nullable<Function>;

    containerMouseleaveListener: Nullable<Function>;

    clickListener: Nullable<Function>;

    focusListener: Nullable<Function>;

    blurListener: Nullable<Function>;

    touchStartListener: Nullable<Function>;

    touchEndListener: Nullable<Function>;

    documentTouchListener: Nullable<Function>;

    documentEscapeListener: Nullable<Function>;

    scrollHandler: any;

    resizeListener: any;

    _componentStyle = inject(TooltipStyle);

    interactionInProgress = false;

    /**
     * Used to pass attributes to DOM elements inside the Tooltip component.
     * @defaultValue undefined
     * @deprecated use pTooltipPT instead.
     * @group Props
     */
    ptTooltip = input<TooltipPassThrough | undefined>();
    /**
     * Used to pass attributes to DOM elements inside the Tooltip component.
     * @defaultValue undefined
     * @group Props
     */
    pTooltipPT = input<TooltipPassThrough | undefined>();
    /**
     * Indicates whether the component should be rendered without styles.
     * @defaultValue undefined
     * @group Props
     */
    pTooltipUnstyled = input<boolean | undefined>();

    constructor(
        public zone: NgZone,
        private viewContainer: ViewContainerRef
    ) {
        super();
        effect(() => {
            const pt = this.ptTooltip() || this.pTooltipPT();
            pt && this.directivePT.set(pt);
        });

        effect(() => {
            this.pTooltipUnstyled() && this.directiveUnstyled.set(this.pTooltipUnstyled());
        });
    }

    onAfterViewInit() {
        if (isPlatformBrowser(this.platformId)) {
            this.zone.runOutsideAngular(() => {
                const tooltipEvent = this.getOption('tooltipEvent');

                if (tooltipEvent === 'hover' || tooltipEvent === 'both') {
                    this.mouseEnterListener = this.onMouseEnter.bind(this);
                    this.mouseLeaveListener = this.onMouseLeave.bind(this);
                    this.clickListener = this.onInputClick.bind(this);
                    this.el.nativeElement.addEventListener('mouseenter', this.mouseEnterListener);
                    this.el.nativeElement.addEventListener('click', this.clickListener);
                    this.el.nativeElement.addEventListener('mouseleave', this.mouseLeaveListener);

                    // Touch support
                    this.touchStartListener = this.onTouchStart.bind(this);
                    this.touchEndListener = this.onTouchEnd.bind(this);
                    this.el.nativeElement.addEventListener('touchstart', this.touchStartListener, { passive: true });
                    this.el.nativeElement.addEventListener('touchend', this.touchEndListener, { passive: true });
                }
                if (tooltipEvent === 'focus' || tooltipEvent === 'both') {
                    this.focusListener = this.onFocus.bind(this);
                    this.blurListener = this.onBlur.bind(this);

                    const target: any = this.describedTarget;
                    target.addEventListener('focus', this.focusListener);
                    target.addEventListener('blur', this.blurListener);
                }
            });
        }
    }

    onChanges(simpleChange: SimpleChanges) {
        if (simpleChange.tooltipPosition) {
            this.setOption({ tooltipPosition: simpleChange.tooltipPosition.currentValue });
        }

        if (simpleChange.tooltipEvent) {
            this.setOption({ tooltipEvent: simpleChange.tooltipEvent.currentValue });
        }

        if (simpleChange.appendTo) {
            this.setOption({ appendTo: simpleChange.appendTo.currentValue });
        }

        if (simpleChange.positionStyle) {
            this.setOption({ positionStyle: simpleChange.positionStyle.currentValue });
        }

        if (simpleChange.tooltipStyleClass) {
            this.setOption({ tooltipStyleClass: simpleChange.tooltipStyleClass.currentValue });
        }

        if (simpleChange.tooltipZIndex) {
            this.setOption({ tooltipZIndex: simpleChange.tooltipZIndex.currentValue });
        }

        if (simpleChange.escape) {
            this.setOption({ escape: simpleChange.escape.currentValue });
        }

        if (simpleChange.showDelay) {
            this.setOption({ showDelay: simpleChange.showDelay.currentValue });
        }

        if (simpleChange.hideDelay) {
            this.setOption({ hideDelay: simpleChange.hideDelay.currentValue });
        }

        if (simpleChange.life) {
            this.setOption({ life: simpleChange.life.currentValue });
        }

        if (simpleChange.positionTop) {
            this.setOption({ positionTop: simpleChange.positionTop.currentValue });
        }

        if (simpleChange.positionLeft) {
            this.setOption({ positionLeft: simpleChange.positionLeft.currentValue });
        }

        if (simpleChange.disabled) {
            this.setOption({ disabled: simpleChange.disabled.currentValue });
        }

        if (simpleChange.content) {
            this.setOption({ tooltipLabel: simpleChange.content.currentValue });

            if (this.active) {
                if (simpleChange.content.currentValue) {
                    if (this.container && this.container.offsetParent) {
                        this.updateText();
                        this.align();
                    } else {
                        this.show();
                    }
                } else {
                    this.hide();
                }
            }
        }

        if (simpleChange.autoHide) {
            this.setOption({ autoHide: simpleChange.autoHide.currentValue });
        }

        if (simpleChange.showOnEllipsis) {
            this.setOption({ showOnEllipsis: simpleChange.showOnEllipsis.currentValue });
        }

        if (simpleChange.id) {
            this.setOption({ id: simpleChange.id.currentValue });
        }

        if (simpleChange.tooltipOptions) {
            this.setOption(simpleChange.tooltipOptions.currentValue ?? {});
            this.deactivate();

            if (this.active) {
                if (this.getOption('tooltipLabel')) {
                    if (this.container && this.container.offsetParent) {
                        this.updateText();
                        this.align();
                    } else {
                        this.show();
                    }
                } else {
                    this.hide();
                }
            }
        }
    }

    isAutoHide(): boolean {
        return this.getOption('autoHide');
    }

    onMouseEnter(e: Event) {
        if (!this.container && !this.showTimeout) {
            this.activate();
        }
    }

    onMouseLeave(e: MouseEvent) {
        if (!this.isAutoHide()) {
            const valid = hasClass(e.relatedTarget as any, 'p-tooltip') || hasClass(e.relatedTarget as any, 'p-tooltip-text') || hasClass(e.relatedTarget as any, 'p-tooltip-arrow');
            !valid && this.deactivate();
        } else {
            this.deactivate();
        }
    }

    onTouchStart(e: TouchEvent) {
        if (!this.container && !this.showTimeout) {
            this.activate();

            if (!this.isAutoHide()) {
                this.bindDocumentTouchListener();
            }
        }
    }

    onTouchEnd(e: TouchEvent) {
        if (this.isAutoHide()) {
            this.deactivate();
        }
    }

    bindDocumentTouchListener() {
        if (!this.documentTouchListener) {
            this.documentTouchListener = this.renderer.listen('document', 'touchstart', (e: TouchEvent) => {
                if (this.container && !this.container.contains(e.target) && !this.el.nativeElement.contains(e.target)) {
                    this.deactivate();
                    this.unbindDocumentTouchListener();
                }
            });
        }
    }

    unbindDocumentTouchListener() {
        if (this.documentTouchListener) {
            this.documentTouchListener();
            this.documentTouchListener = null;
        }
    }

    onFocus(e: Event) {
        this.activate();
    }

    onBlur(e: Event) {
        // Focus moving into a persistent tooltip stays with it, so its links can be reached by Tab.
        const to = (e as FocusEvent)?.relatedTarget;
        if (this.container && to instanceof Node && this.container.contains(to)) return;
        this.deactivate();
    }

    onInputClick(e: Event) {
        this.deactivate();
    }

    hasEllipsis(): boolean {
        const el = this.el.nativeElement;
        return el.offsetWidth < el.scrollWidth || el.offsetHeight < el.scrollHeight;
    }

    activate() {
        if (!this.interactionInProgress) {
            if (this.getOption('showOnEllipsis') && !this.hasEllipsis()) {
                return;
            }
            this.active = true;
            this.clearHideTimeout();

            if (this.getOption('showDelay'))
                this.showTimeout = setTimeout(() => {
                    this.show();
                }, this.getOption('showDelay'));
            else this.show();

            if (this.getOption('life')) {
                let duration = this.getOption('showDelay') ? this.getOption('life') + this.getOption('showDelay') : this.getOption('life');
                this.hideTimeout = setTimeout(() => {
                    this.hide();
                }, duration);
            }

            if (this.getOption('hideOnEscape')) {
                this.documentEscapeListener = this.renderer.listen('document', 'keydown.escape', () => {
                    // Escape from inside a persistent tooltip returns focus to the target it belongs to.
                    const returnFocus = !!this.container?.contains(document.activeElement);
                    const target = this.describedTarget;
                    this.deactivate();
                    this.documentEscapeListener?.();
                    returnFocus && target.focus();
                });
            }
            this.interactionInProgress = true;
        }
    }

    deactivate() {
        this.interactionInProgress = false;
        this.active = false;
        this.clearShowTimeout();

        if (this.getOption('hideDelay')) {
            this.clearHideTimeout(); //life timeout
            this.hideTimeout = setTimeout(() => {
                this.hide();
            }, this.getOption('hideDelay'));
        } else {
            this.hide();
        }

        if (this.documentEscapeListener) {
            this.documentEscapeListener();
        }
    }

    create() {
        if (this.container) {
            this.clearHideTimeout();
            this.remove();
        }

        this.container = createElement('div', { class: this.cx('root'), 'p-bind': this.ptm('root'), 'data-pc-section': 'root' });
        this.container.setAttribute('role', 'tooltip');
        this.container.setAttribute('id', this.getOption('id'));
        let tooltipArrow = createElement('div', { class: this.cx('arrow'), 'p-bind': this.ptm('arrow'), 'data-pc-section': 'arrow' });
        this.container.appendChild(tooltipArrow);
        this.tooltipText = createElement('div', { class: this.cx('text'), 'p-bind': this.ptm('text'), 'data-pc-section': 'text' });

        this.updateText();

        if (this.getOption('positionStyle')) {
            this.container.style.position = this.getOption('positionStyle');
        }

        this.container.appendChild(this.tooltipText);

        if (this.getOption('appendTo') === 'body') document.body.appendChild(this.container);
        else if (this.getOption('appendTo') === 'target') appendChild(this.container, this.el.nativeElement);
        else appendChild(this.getOption('appendTo'), this.container);

        this.container.style.display = 'none';

        if (this.fitContent) {
            this.container.style.width = 'fit-content';
        }

        if (this.isAutoHide()) {
            this.container.style.pointerEvents = 'none';
        } else {
            this.container.style.pointerEvents = 'unset';
            this.bindContainerMouseleaveListener();
        }
    }

    bindContainerMouseleaveListener() {
        if (!this.containerMouseleaveListener) {
            const targetEl: any = this.container ?? this.container.nativeElement;

            this.containerMouseleaveListener = this.renderer.listen(targetEl, 'mouseleave', (e) => {
                this.deactivate();
            });
        }
    }

    unbindContainerMouseleaveListener() {
        if (this.containerMouseleaveListener) {
            // This called bindContainerMouseleaveListener(), which does nothing while a listener is
            // bound, so the listener was never removed (upstream 22.1.5).
            this.containerMouseleaveListener();
            this.containerMouseleaveListener = null;
        }
    }

    show() {
        if (!this.getOption('tooltipLabel') || this.getOption('disabled')) {
            return;
        }

        this.create();

        const token = ++this.showToken;
        const reveal = () => {
            if (token !== this.showToken || !this.container) return;
            this.container.style.display = 'inline-block';
            this.align();
            this.fadeIn();
        };
        const opening = this.openingDialogAnimations();
        if (opening.length) Promise.all(opening.map((a) => a.finished)).then(reveal, reveal);
        else reveal();

        if (this.getOption('tooltipZIndex') === 'auto') ZIndexUtils.set('tooltip', this.container, this.config.zIndex.tooltip);
        else this.container.style.zIndex = this.getOption('tooltipZIndex');

        this.describe();
        this.bindKeyboardListeners();
        this.bindDocumentResizeListener();
        this.bindScrollListener();
    }

    /**
     * The animations still running on the dialog around the target. While a dialog opens, its
     * animation moves the target, so the tooltip waits for it before measuring. It used to wait a
     * fixed 100 ms inside any dialog, opening or long open, and start its fade at once, so it
     * appeared late and already 40% opaque (upstream 22.1.5).
     */
    private openingDialogAnimations(): Animation[] {
        const dialog = (this.el.nativeElement as HTMLElement).closest('.p-dialog') as HTMLElement | null;
        if (!dialog || typeof dialog.getAnimations !== 'function') return [];
        return dialog.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity);
    }

    /**
     * Fade the tooltip in, unless the user asked the system to reduce motion. The frame is kept, so
     * removing the tooltip cancels the fade: the shared fadeIn() helper kept writing opacity to the
     * removed element until it reached 1, and ignored reduced motion (upstream 22.1.5).
     */
    private fadeIn() {
        this.cancelFade();
        const el = this.container as HTMLElement | null;
        if (!el || prefersReducedMotion()) return;
        el.style.opacity = '0';
        let last = performance.now();
        const tick = () => {
            this.fadeFrame = null;
            if (this.container !== el) return;
            const now = performance.now();
            const opacity = Math.min(1, Number(el.style.opacity) + (now - last) / FADE_DURATION);
            el.style.opacity = String(opacity);
            last = now;
            if (opacity < 1) this.fadeFrame = requestAnimationFrame(tick);
        };
        this.zone.runOutsideAngular(() => (this.fadeFrame = requestAnimationFrame(tick)));
    }

    private cancelFade() {
        if (this.fadeFrame !== null) {
            cancelAnimationFrame(this.fadeFrame);
            this.fadeFrame = null;
        }
    }

    /**
     * The element the tooltip listens on for focus and describes: the focusable root of a component
     * host, or the target itself (an input inside an input wrapper).
     */
    private get describedTarget(): HTMLElement {
        const host = this.el.nativeElement as HTMLElement;
        return (host.querySelector('.p-component') as HTMLElement | null) ?? (this.getTarget(host) as HTMLElement);
    }

    /**
     * Link the target to the tooltip while it shows (WAI-ARIA tooltip pattern). The tooltip had an id
     * option and never used it, so assistive technology had no way to tie the two (upstream 22.1.5).
     * Ids the author put in aria-describedby are kept.
     */
    private describe() {
        const target = this.describedTarget;
        const id = this.getOption('id');
        const ids = (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
        if (!ids.includes(id)) target.setAttribute('aria-describedby', [...ids, id].join(' '));
        this.describedElement = target;
    }

    private undescribe() {
        const target = this.describedElement;
        if (!target) return;
        const id = this.container?.id || this.getOption('id');
        const ids = (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((t) => t && t !== id);
        if (ids.length) target.setAttribute('aria-describedby', ids.join(' '));
        else target.removeAttribute('aria-describedby');
        this.describedElement = null;
    }

    /**
     * A persistent tooltip (autoHide false) can hold links. Tab from the target moves into it, Tab
     * past its last focusable element leaves it for whatever follows the target, and Shift+Tab from
     * its first goes back to the target. Appended to the body, it sat at the end of the tab order,
     * and the target's blur hid it before focus could arrive (upstream 22.1.5).
     */
    private bindKeyboardListeners() {
        if (this.isAutoHide() || !this.container) return;
        const target = this.describedTarget;
        const container = this.container as HTMLElement;
        this.targetKeydownListener = this.renderer.listen(target, 'keydown', (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || e.shiftKey) return;
            const first = this.focusablesInside()[0];
            if (first) {
                e.preventDefault();
                first.focus();
            }
        });
        this.containerKeydownListener = this.renderer.listen(container, 'keydown', (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const inside = this.focusablesInside();
            const index = inside.indexOf(document.activeElement as HTMLElement);
            if (e.shiftKey && index === 0) {
                e.preventDefault();
                target.focus();
            } else if (!e.shiftKey && index === inside.length - 1) {
                e.preventDefault();
                const after = this.focusableAfter(target);
                this.deactivate();
                after?.focus();
            }
        });
        this.containerFocusoutListener = this.renderer.listen(container, 'focusout', (e: FocusEvent) => {
            const to = e.relatedTarget as Node | null;
            if (!to || (!container.contains(to) && !target.contains(to))) this.deactivate();
        });
    }

    private unbindKeyboardListeners() {
        this.targetKeydownListener?.();
        this.containerKeydownListener?.();
        this.containerFocusoutListener?.();
        this.targetKeydownListener = this.containerKeydownListener = this.containerFocusoutListener = null;
    }

    private focusablesInside(): HTMLElement[] {
        return this.container ? (getFocusableElements(this.container) as HTMLElement[]) : [];
    }

    /** The first focusable element after the target in document order, outside the target and the tooltip. */
    private focusableAfter(target: HTMLElement): HTMLElement | null {
        const all = getFocusableElements(document.body) as HTMLElement[];
        return all.find((el) => !target.contains(el) && !this.container?.contains(el) && !!(target.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) ?? null;
    }

    hide() {
        if (this.getOption('tooltipZIndex') === 'auto') {
            ZIndexUtils.clear(this.container);
        }
        this.remove();
    }

    updateText() {
        const content = this.getOption('tooltipLabel');
        if (content && typeof (content as TemplateRef<any>).createEmbeddedView === 'function') {
            const embeddedViewRef = this.viewContainer.createEmbeddedView(content);
            embeddedViewRef.detectChanges();
            embeddedViewRef.rootNodes.forEach((node) => this.tooltipText.appendChild(node));
        } else if (this.getOption('escape')) {
            // textContent, not innerHTML: under require-trusted-types-for even an empty string needs
            // TrustedHTML, so every tooltip threw in such an app (upstream 22.1.5). With escape false
            // the content is HTML by request, and a TrustedHTML value from the app's policy works.
            this.tooltipText.textContent = content;
        } else {
            this.tooltipText.innerHTML = content;
        }
    }

    align() {
        const position = this.getOption('tooltipPosition') as keyof typeof positionPriority;

        const positionPriority = {
            top: [this.alignTop, this.alignBottom, this.alignRight, this.alignLeft],
            bottom: [this.alignBottom, this.alignTop, this.alignRight, this.alignLeft],
            left: [this.alignLeft, this.alignRight, this.alignTop, this.alignBottom],
            right: [this.alignRight, this.alignLeft, this.alignTop, this.alignBottom]
        };

        const alignFns = positionPriority[position] || [];
        for (let [index, alignmentFn] of alignFns.entries()) {
            if (index === 0) alignmentFn.call(this);
            else if (this.isOutOfBounds()) alignmentFn.call(this);
            else break;
        }
    }

    getHostOffset() {
        if (this.getOption('appendTo') === 'body' || this.getOption('appendTo') === 'target') {
            let offset = this.el.nativeElement.getBoundingClientRect();
            let targetLeft = offset.left + getWindowScrollLeft();
            let targetTop = offset.top + getWindowScrollTop();

            return { left: targetLeft, top: targetTop };
        } else {
            return { left: 0, top: 0 };
        }
    }

    /**
     * The box a right-positioned tooltip measures. On a component host (`agl-*`) that is the
     * component's own root (`.p-component`), not the host element, whose box can be wider (a block
     * host around an inline root). The host is used when it is itself the root, or when no root is
     * found inside it. The prefix tested here was still `P-` after the rename, so this branch never
     * ran and every component host measured the host element (#173).
     */
    private get activeElement(): HTMLElement {
        const host = this.el.nativeElement as HTMLElement;
        if (!host.nodeName.startsWith('AGL-') || host.classList.contains('p-component')) return host;
        return (findSingle(host, '.p-component') as HTMLElement | null) ?? host;
    }

    alignRight() {
        this.preAlign('right');
        const el = this.activeElement;
        const offsetLeft = getOuterWidth(el);
        const offsetTop = (getOuterHeight(el) - getOuterHeight(this.container)) / 2;
        this.alignTooltip(offsetLeft, offsetTop);
        let arrowElement = this.getArrowElement();

        arrowElement.style.top = '50%';
        arrowElement.style.right = null;
        arrowElement.style.bottom = null;
        arrowElement.style.left = '0';
    }

    alignLeft() {
        this.preAlign('left');
        let arrowElement = this.getArrowElement();
        let offsetLeft = getOuterWidth(this.container);
        let offsetTop = (getOuterHeight(this.el.nativeElement) - getOuterHeight(this.container)) / 2;
        this.alignTooltip(-offsetLeft, offsetTop);

        arrowElement.style.top = '50%';
        arrowElement.style.right = '0';
        arrowElement.style.bottom = null;
        arrowElement.style.left = null;
    }

    alignTop() {
        this.preAlign('top');
        let arrowElement = this.getArrowElement();
        let hostOffset = this.getHostOffset();
        let elementWidth = getOuterWidth(this.container);

        let offsetLeft = (getOuterWidth(this.el.nativeElement) - getOuterWidth(this.container)) / 2;
        let offsetTop = getOuterHeight(this.container);
        this.alignTooltip(offsetLeft, -offsetTop);

        let elementRelativeCenter = hostOffset.left - this.getHostOffset().left + elementWidth / 2;
        arrowElement.style.top = null;
        arrowElement.style.right = null;
        arrowElement.style.bottom = '0';
        arrowElement.style.left = elementRelativeCenter + 'px';
    }

    getArrowElement(): any {
        return findSingle(this.container, '[data-pc-section="arrow"]');
    }

    alignBottom() {
        this.preAlign('bottom');
        let arrowElement = this.getArrowElement();
        let elementWidth = getOuterWidth(this.container);
        let hostOffset = this.getHostOffset();
        let offsetLeft = (getOuterWidth(this.el.nativeElement) - getOuterWidth(this.container)) / 2;
        let offsetTop = getOuterHeight(this.el.nativeElement);
        this.alignTooltip(offsetLeft, offsetTop);

        let elementRelativeCenter = hostOffset.left - this.getHostOffset().left + elementWidth / 2;

        arrowElement.style.top = '0';
        arrowElement.style.right = null;
        arrowElement.style.bottom = null;
        arrowElement.style.left = elementRelativeCenter + 'px';
    }

    alignTooltip(offsetLeft, offsetTop) {
        let hostOffset = this.getHostOffset();
        let left = hostOffset.left + offsetLeft;
        let top = hostOffset.top + offsetTop;
        this.container.style.left = left + this.getOption('positionLeft') + 'px';
        this.container.style.top = top + this.getOption('positionTop') + 'px';
    }

    /**
     * Merge options in. An option given as `undefined` goes back to its default rather than becoming
     * undefined: `[tooltipPosition]="maybe"` or `tooltipOptions: { tooltipPosition: undefined }` left the
     * tooltip with no position at all, drawn at the left edge of the page (upstream 22.1.5).
     */
    setOption(option: any) {
        const next: Record<string, unknown> = { ...this._tooltipOptions };
        for (const [key, value] of Object.entries(option ?? {})) {
            next[key] = value === undefined ? (key === 'id' ? this._tooltipOptions.id : TOOLTIP_DEFAULTS[key as keyof typeof TOOLTIP_DEFAULTS]) : value;
        }
        this._tooltipOptions = next as typeof this._tooltipOptions;
    }

    getOption(option: string) {
        return this._tooltipOptions[option as keyof typeof this.tooltipOptions];
    }

    getTarget(el: Element) {
        return hasClass(el, 'p-inputwrapper') ? findSingle(el, 'input') : el;
    }

    /** The width the tooltip takes with room to spare, measured off-screen before each placement. */
    private naturalWidth = 0;

    preAlign(position: string) {
        this.container.style.left = -999 + 'px';
        this.container.style.top = -999 + 'px';
        this.container.className = this.cn(this.cx('root'), this.ptm('root')?.class, 'p-tooltip-' + position, this.getOption('tooltipStyleClass'));
        this.naturalWidth = getOuterWidth(this.container);
    }

    isOutOfBounds(): boolean {
        let offset = this.container.getBoundingClientRect();
        let targetTop = offset.top;
        let targetLeft = offset.left;
        let width = getOuterWidth(this.container);
        let height = getOuterHeight(this.container);
        let viewport = getViewport();

        // A tooltip placed against the edge of the page does not overflow it: it shrinks, down to a
        // word per line, so it still looked in bounds and the next position was never tried (measured
        // 2026-11-17 beside a menu as wide as the page). Narrower than its natural width means it
        // does not fit there.
        const squeezed = width < this.naturalWidth - 1;

        return squeezed || targetLeft + width > viewport.width || targetLeft < 0 || targetTop < 0 || targetTop + height > viewport.height;
    }

    onWindowResize(e: Event) {
        this.hide();
    }

    bindDocumentResizeListener() {
        this.zone.runOutsideAngular(() => {
            this.resizeListener = this.onWindowResize.bind(this);
            window.addEventListener('resize', this.resizeListener);
        });
    }

    unbindDocumentResizeListener() {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
    }

    bindScrollListener() {
        if (!this.scrollHandler) {
            this.scrollHandler = new ConnectedOverlayScrollHandler(this.el.nativeElement, () => {
                if (this.container) {
                    this.hide();
                }
            });
        }

        this.scrollHandler.bindScrollListener();
    }

    unbindScrollListener() {
        if (this.scrollHandler) {
            this.scrollHandler.unbindScrollListener();
        }
    }

    unbindEvents() {
        const tooltipEvent = this.getOption('tooltipEvent');

        if (tooltipEvent === 'hover' || tooltipEvent === 'both') {
            this.el.nativeElement.removeEventListener('mouseenter', this.mouseEnterListener);
            this.el.nativeElement.removeEventListener('mouseleave', this.mouseLeaveListener);
            this.el.nativeElement.removeEventListener('click', this.clickListener);

            // Touch support
            this.el.nativeElement.removeEventListener('touchstart', this.touchStartListener);
            this.el.nativeElement.removeEventListener('touchend', this.touchEndListener);
            this.unbindDocumentTouchListener();
        }
        if (tooltipEvent === 'focus' || tooltipEvent === 'both') {
            const target: any = this.describedTarget;
            target.removeEventListener('focus', this.focusListener);
            target.removeEventListener('blur', this.blurListener);
        }
        this.unbindDocumentResizeListener();
    }

    remove() {
        this.showToken++;
        this.cancelFade();
        this.undescribe();
        this.unbindKeyboardListeners();

        if (this.container && this.container.parentElement) {
            if (this.getOption('appendTo') === 'body') document.body.removeChild(this.container);
            else if (this.getOption('appendTo') === 'target') this.el.nativeElement.removeChild(this.container);
            else removeChild(this.getOption('appendTo'), this.container);
        }

        this.unbindDocumentResizeListener();
        this.unbindScrollListener();
        this.unbindContainerMouseleaveListener();
        this.unbindDocumentTouchListener();
        this.clearTimeouts();
        this.container = null;
        this.scrollHandler = null;
    }

    clearShowTimeout() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
    }

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    clearTimeouts() {
        this.clearShowTimeout();
        this.clearHideTimeout();
    }

    onDestroy() {
        this.unbindEvents();

        if (this.container) {
            ZIndexUtils.clear(this.container);
        }

        this.remove();

        if (this.scrollHandler) {
            this.scrollHandler.destroy();
            this.scrollHandler = null;
        }

        if (this.documentEscapeListener) {
            this.documentEscapeListener();
        }
    }
}

@NgModule({
    imports: [Tooltip, BindModule],
    exports: [Tooltip, BindModule]
})
export class TooltipModule {}
