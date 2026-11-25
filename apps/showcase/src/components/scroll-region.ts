import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input, signal } from '@angular/core';

/**
 * A box that may scroll sideways, made reachable from the keyboard only while it does.
 *
 * A region that scrolls must take focus, or a keyboard user cannot scroll it (axe:
 * `scrollable-region-focusable`). Giving every such box a tab stop would add one per API table,
 * dozens on some pages, almost all of which never scroll on a desktop. So the box is measured,
 * and only one that is actually wider inside than out becomes a named region in the tab order.
 *
 * Measured after rendering and again whenever the box changes size, so it follows a window that
 * is resized or a phone that is turned.
 */
@Directive({
    selector: '[aglScrollRegion]',
    host: {
        '[attr.tabindex]': 'scrolls() ? 0 : null',
        '[attr.role]': 'scrolls() ? "region" : null',
        '[attr.aria-label]': 'scrolls() ? label() : null'
    }
})
export class ScrollRegion {
    /** What the region is called while it scrolls: "Inputs of DatePicker". */
    readonly label = input.required<string>({ alias: 'aglScrollRegion' });

    readonly scrolls = signal(false);

    constructor() {
        const box = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            const observer = new ResizeObserver(() => this.scrolls.set(box.scrollWidth > box.clientWidth));

            observer.observe(box);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }
}
