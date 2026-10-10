import { computed, Directive, effect, ElementRef, inject, input, NgModule, Renderer2, SecurityContext, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { cn, equals } from '@anguless/angulux-utils';

/** Keys whose value the browser parses as markup. Compared lowercased. */
const HTML_KEYS = new Set(['innerhtml', 'outerhtml', 'srcdoc']);

/** Keys whose value the browser follows as a URL. Compared lowercased. */
const URL_KEYS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href']);

/**
 * Bind directive provides dynamic attribute, property, and event listener binding functionality.
 * @group Components
 */
@Directive({
    selector: '[aglBind]',
    standalone: true,
    host: {
        '[style]': 'styles()',
        '[class]': 'classes()'
    }
})
export class Bind {
    /**
     * Dynamic attributes, properties, and event listeners to be applied to the host element.
     *
     * Each key is set as an attribute, and also assigned to the element property of the same
     * name when one exists. Values that the browser would parse as markup (`innerHTML`,
     * `outerHTML`, `srcdoc`) or follow as a URL (`href`, `src`, `action`, `formaction`,
     * `xlink:href`) go through Angular's sanitizer first, exactly as they would in a template
     * binding. To write such a value unsanitized on purpose, pass a value from
     * `DomSanitizer.bypassSecurityTrustHtml` or `bypassSecurityTrustUrl`. An `on*` key installs
     * a listener when its value is a function; any other `on*` value is ignored, because as an
     * attribute it would be script.
     * @group Props
     */
    aglBind = input<{ [key: string]: any } | undefined>(undefined);

    private _attrs = signal<{ [key: string]: any } | undefined>(undefined);
    private attrs = computed(() => this._attrs() || this.aglBind());

    styles = computed(() => this.attrs()?.style);
    classes = computed(() => cn(this.attrs()?.class));

    private listeners: { eventName: string; unlisten: () => void }[] = [];

    private sanitizer = inject(DomSanitizer);

    constructor(
        private el: ElementRef,
        private renderer: Renderer2
    ) {
        effect(() => {
            const { style, class: className, ...rest } = this.attrs() || {};

            for (const [key, value] of Object.entries(rest)) {
                if (key.startsWith('on') && typeof value === 'function') {
                    const eventName = key.slice(2).toLowerCase();

                    // add listener if not already added
                    if (!this.listeners.some((l) => l.eventName === eventName)) {
                        const unlisten = this.renderer.listen(this.el.nativeElement, eventName, value);
                        this.listeners.push({ eventName, unlisten });
                    }
                } else if (value === null || value === undefined) {
                    // remove attr
                    this.renderer.removeAttribute(this.el.nativeElement, key);
                } else if (key.startsWith('on')) {
                    // a non-function handler would be an inline script attribute; never write it
                } else {
                    // attr & prop fallback, through the sanitizer where the browser would execute
                    const safe = this.sanitize(key, value);
                    this.renderer.setAttribute(this.el.nativeElement, key, String(safe));
                    if (key in this.el.nativeElement) {
                        (this.el.nativeElement as any)[key] = safe;
                    }
                }
            }
        });
    }

    ngOnDestroy() {
        this.clearListeners();
    }

    public setAttrs(attrs: { [key: string]: any } | undefined) {
        if (!equals(this._attrs(), attrs)) {
            this._attrs.set(attrs);
        }
    }

    private sanitize(key: string, value: unknown): unknown {
        const name = key.toLowerCase();
        const context = HTML_KEYS.has(name) ? SecurityContext.HTML : URL_KEYS.has(name) ? SecurityContext.URL : null;
        return context === null ? value : (this.sanitizer.sanitize(context, value as string) ?? '');
    }

    private clearListeners() {
        this.listeners.forEach(({ unlisten }) => unlisten());
        this.listeners = [];
    }
}

@NgModule({
    imports: [Bind],
    exports: [Bind]
})
export class BindModule {}
