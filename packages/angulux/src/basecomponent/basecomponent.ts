import { DOCUMENT, isPlatformServer } from '@angular/common';
import { ChangeDetectorRef, computed, Directive, effect, ElementRef, inject, InjectionToken, Injector, input, PLATFORM_ID, Renderer2, signal, SimpleChanges } from '@angular/core';
import { Theme, ThemeService } from '@anguless/angulux-styled';
import { cn, getKeyValue, isArray, isFunction, isNotEmpty, isObject, isString, mergeProps, resolve, toFlatCase, uuid } from '@anguless/angulux-utils';
import type { Lifecycle, PassThroughOptions } from '@anguless/angulux/api';
import { Base, BaseStyle } from '@anguless/angulux/base';
import { AnguluxConfig } from '@anguless/angulux/config';
import { BaseComponentStyle } from './style/basecomponentstyle';

export const PARENT_INSTANCE = new InjectionToken<BaseComponent>('PARENT_INSTANCE');

/**
 * The theme object the `Base` style names were loaded under.
 *
 * The base stylesheet and each component's structural stylesheet are written through `dt()`, so
 * their text names variables after the theme's prefix and has to be written again when the theme
 * changes. `Theme` swaps in a new object whenever the theme, its preset or its options change
 * (`update`, `setPreset`, `setOptions`), so a different object is a theme change, and the names
 * loaded under the old one are forgotten once.
 *
 * This replaces a `Base.clearLoadedStyleNames()` that ran every time a component registered a
 * theme listener, which is every time a component was created. Each new component then wrote the
 * base stylesheet again and searched the document for its `<style>` (#168, upstream 22.1.3 Core).
 */
let baseStylesTheme: unknown;

function forgetBaseStylesOnThemeChange(): void {
    const theme = Theme.getTheme();

    if (theme !== baseStylesTheme) {
        baseStylesTheme = theme;
        Base.clearLoadedStyleNames();
    }
}

/**
 * For a style's `classes` or `inlineStyles` object: the key of it that each requested name
 * resolves to. `getKeyValue` finds that key by lower-casing and stripping every key of the object
 * until one matches, on every call, and a template makes that call for every element it styles on
 * every check.
 */
const MATCHED_KEYS = new WeakMap<object, Map<string, string>>();

/** `getKeyValue(options, key, params)`, remembering which key of `options` a plain name matched. */
function optionValue(source: unknown, key: string, params: object) {
    let matched: string | undefined;

    if (key && !key.includes('.') && isObject(source)) {
        let matchedKeys = MATCHED_KEYS.get(source);

        if (!matchedKeys) MATCHED_KEYS.set(source, (matchedKeys = new Map()));

        matched = matchedKeys.get(key);

        if (matched === undefined || !(matched in source)) {
            const flatKey = toFlatCase(key);

            matched = flatKey ? Object.keys(source).find((k) => toFlatCase(k) === flatKey) : undefined;
            matched !== undefined && matchedKeys.set(key, matched);
        }
    }

    // Resolved twice, as getKeyValue does: once for the entry, once for what the entry returned.
    return matched === undefined ? getKeyValue(source as Record<string, unknown> | undefined, key, params) : resolve(resolve((source as Record<string, unknown>)[matched], params), params);
}

/**
 * `instance.$style[key]` without building `$style`. A template calls `cx()` for every element it
 * styles on every check, and `$style` copies the style service and its host's into a new object
 * each time it is read. The spread there copies own enumerable properties, the component's over
 * the host's, so a property the component's own service has is the answer; otherwise this takes
 * the long way.
 */
function styleValue(instance: BaseComponent, key: 'classes' | 'inlineStyles' | 'name') {
    const own = instance['_componentStyle'];

    return own && {}.propertyIsEnumerable.call(own, key) ? own[key] : instance.$style[key];
}

const SECTION = 'data-pc-section';

/**
 * Whether any pass-through can apply to a component: its own `pt`, or the application's. With
 * neither, `ptm()` has only the `data-pc-*` attributes to return and no hook exists, and that is
 * the state of nearly every component in nearly every application.
 *
 * A component nested in another one is handed `[pt]="ptm('pcChild')"` by its parent, which is
 * never null: with nothing configured it is the parent's section name alone. That names the
 * child's root and holds no pass-through, so it counts as none.
 */
function hasPT(instance: BaseComponent) {
    // Nothing is iterated when the component has no pass-through of its own.
    for (const key in instance.$pt() as object) if (key !== SECTION) return true;

    return instance.config?.pt() != null;
}

/**
 * The attributes of each section other than the root: they depend on the key alone, so one frozen
 * object per key serves every component. A stable object also lets a parent hand `ptm('pcChild')`
 * to a child input without that input changing on every check.
 */
const sectionDatasets: Record<string, Readonly<Record<string, string>>> = {};

@Directive({
    standalone: true,
    providers: [BaseComponentStyle, BaseStyle]
})
export class BaseComponent<PT = any> implements Lifecycle {
    public document: Document = inject(DOCUMENT);

    public platformId: any = inject(PLATFORM_ID);

    public el: ElementRef = inject(ElementRef);

    public readonly injector: Injector = inject(Injector);

    public readonly cd: ChangeDetectorRef = inject(ChangeDetectorRef);

    public renderer: Renderer2 = inject(Renderer2);

    public config: AnguluxConfig = inject(AnguluxConfig);

    public $parentInstance: BaseComponent | undefined = inject(PARENT_INSTANCE, { optional: true, skipSelf: true }) ?? undefined;

    public baseComponentStyle: BaseComponentStyle = inject(BaseComponentStyle);

    public baseStyle: BaseStyle = inject(BaseStyle);

    public scopedStyleEl: any;

    public parent = this.$params.parent;

    protected readonly cn = cn;

    private _themeScopedListener: () => void;

    private themeChangeListenerMap: Map<string, any> = new Map();

    /******************** Inputs ********************/

    /**
     * Defines scoped design tokens of the component.
     * @defaultValue undefined
     * @group Props
     */
    dt = input<Object | undefined>();
    /**
     * Indicates whether the component should be rendered without styles.
     * @defaultValue undefined
     * @group Props
     */
    unstyled = input<boolean | undefined>();
    /**
     * Used to pass attributes to DOM elements inside the component.
     *
     * Keys become attributes, and a key that names a DOM property is also assigned to that
     * property. Values the browser would execute go through Angular's sanitizer first, as in a
     * template binding: markup in `innerHTML`, `outerHTML` and `srcdoc`, and URLs in `href`,
     * `src`, `action`, `formaction` and `xlink:href`. To write one of those unsanitized on
     * purpose, pass a `DomSanitizer.bypassSecurityTrustHtml` or `bypassSecurityTrustUrl` value.
     * An `on*` key must be a function, and any other value for it is ignored. Keys themselves
     * are applied as given, so let data from users choose values, never keys.
     * @defaultValue undefined
     * @group Props
     */
    pt = input<PT | undefined>();
    /**
     * Used to configure passthrough(pt) options of the component.
     * @group Props
     * @defaultValue undefined
     */
    ptOptions = input<PassThroughOptions | undefined>();

    /******************** Computed ********************/

    $attrSelector = uuid('pc');

    get $name() {
        return this['componentName'] || 'UnknownComponent';
    }

    private get $hostName() {
        return this['hostName'];
    }

    get $el() {
        return this.el?.nativeElement;
    }

    directivePT = signal<any>(undefined);

    directiveUnstyled = signal<boolean | undefined>(undefined);

    $unstyled = computed(() => {
        return this.unstyled() ?? this.directiveUnstyled() ?? this.config?.unstyled() ?? false;
    });

    $pt = computed(() => {
        return resolve(this.pt() || this.directivePT(), this.$params);
    });

    get $globalPT() {
        return this._getPT(this.config?.pt(), undefined, (value) => resolve(value, this.$params));
    }

    get $defaultPT() {
        return this._getPT(this.config?.pt(), undefined, (value) => this._getOptionValue(value, this.$hostName || this.$name, this.$params) || resolve(value, this.$params));
    }

    get $style() {
        return { theme: undefined, css: undefined, classes: undefined, inlineStyles: undefined, ...(this._getHostInstance(this) || {}).$style, ...this['_componentStyle'] };
    }

    get $styleOptions() {
        return { nonce: this.config?.csp().nonce };
    }

    get $params() {
        const parentInstance = this._getHostInstance(this) || this.$parentInstance;

        return {
            instance: this as any,
            parent: {
                instance: parentInstance
            }
        };
    }

    /******************** Lifecycle Hooks ********************/

    onInit() {
        // NOOP - to be implemented by subclasses
    }

    onChanges(changes: SimpleChanges) {
        // NOOP - to be implemented by subclasses
    }

    onDoCheck() {
        // NOOP - to be implemented by subclasses
    }

    onAfterContentInit() {
        // NOOP - to be implemented by subclasses
    }

    onAfterContentChecked() {
        // NOOP - to be implemented by subclasses
    }

    onAfterViewInit() {
        // NOOP - to be implemented by subclasses
    }

    onAfterViewChecked() {
        // NOOP - to be implemented by subclasses
    }

    onDestroy() {
        // NOOP - to be implemented by subclasses
    }

    /******************** Angular Lifecycle Hooks ********************/

    constructor() {
        // watch _dt_ changes
        effect((onCleanup) => {
            if (this.document && !isPlatformServer(this.platformId)) {
                if (this.dt()) {
                    this._loadScopedThemeStyles(this.dt());
                    this._themeScopedListener = () => this._loadScopedThemeStyles(this.dt());
                    this._themeChangeListener('_themeScopedListener', this._themeScopedListener);
                } else {
                    this._unloadScopedThemeStyles();
                }
            }

            onCleanup(() => {
                this._offThemeChangeListener('_themeScopedListener');
            });
        });

        // watch _unstyled_ changes
        effect((onCleanup) => {
            if (this.document && !isPlatformServer(this.platformId)) {
                if (!this.$unstyled()) {
                    this._loadCoreStyles();
                    this._themeChangeListener('_loadCoreStyles', this._loadCoreStyles); // Update styles with theme settings
                }
            }

            onCleanup(() => {
                this._offThemeChangeListener('_loadCoreStyles');
            });
        });

        this._hook('onBeforeInit');
    }

    /**
     * ⚠ Do not override ngOnInit!
     *
     * Use 'onInit()' in subclasses instead.
     */
    ngOnInit() {
        this._loadCoreStyles();
        this._loadStyles();

        this.onInit();
        this._hook('onInit');
    }

    /**
     * ⚠ Do not override ngOnChanges!
     *
     * Use 'onChanges(changes: SimpleChanges)' in subclasses instead.
     */
    ngOnChanges(changes: SimpleChanges) {
        this.onChanges(changes);
        this._hook('onChanges', changes);
    }

    /**
     * ⚠ Do not override ngDoCheck!
     *
     * Use 'onDoCheck()' in subclasses instead.
     */
    ngDoCheck() {
        this.onDoCheck();
        this._hook('onDoCheck');
    }

    /**
     * ⚠ Do not override ngAfterContentInit!
     *
     * Use 'onAfterContentInit()' in subclasses instead.
     */
    ngAfterContentInit() {
        this.onAfterContentInit();
        this._hook('onAfterContentInit');
    }

    /**
     * ⚠ Do not override ngAfterContentChecked!
     *
     * Use 'onAfterContentChecked()' in subclasses instead.
     */
    ngAfterContentChecked() {
        this.onAfterContentChecked();
        this._hook('onAfterContentChecked');
    }

    /**
     * ⚠ Do not override ngAfterViewInit!
     *
     * Use 'onAfterViewInit()' in subclasses instead.
     */
    ngAfterViewInit() {
        // @todo - remove this after implementing pt for root
        this.$el?.setAttribute(this.$attrSelector, '');

        this.onAfterViewInit();
        this._hook('onAfterViewInit');
    }

    /**
     * ⚠ Do not override ngAfterViewChecked!
     *
     * Use 'onAfterViewChecked()' in subclasses instead.
     */
    ngAfterViewChecked() {
        this.onAfterViewChecked();
        this._hook('onAfterViewChecked');
    }

    /**
     * ⚠ Do not override ngOnDestroy!
     *
     * Use 'onDestroy()' in subclasses instead.
     */
    ngOnDestroy() {
        this._removeThemeListeners();
        this._unloadScopedThemeStyles();

        this.onDestroy();
        this._hook('onDestroy');
    }

    /******************** Methods ********************/

    private _mergeProps(fn: any, ...args: any[]) {
        return isFunction(fn) ? fn(...args) : mergeProps(...args);
    }

    private _getHostInstance(instance: any) {
        return instance ? (this.$hostName ? (this.$name === this.$hostName ? instance : this._getHostInstance(instance.$parentInstance)) : instance.$parentInstance) : undefined;
    }

    private _getPropValue(name: string) {
        return this[name] || this._getHostInstance(this)?.[name];
    }

    private _getOptionValue(options: any, key = '', params = {}) {
        return getKeyValue(options, key, params);
    }

    private _hook(hookName: string, ...args: any[]) {
        // Called from every lifecycle hook, the three "checked" ones included, so on every check.
        if (hasPT(this) && !this.$hostName) {
            const selfHook = this._usePT(this._getPT(this.$pt(), this.$name), this._getOptionValue, `hooks.${hookName}`);
            const defaultHook = this._useDefaultPT(this._getOptionValue, `hooks.${hookName}`);

            selfHook?.(...args);
            defaultHook?.(...args);
        }
    }

    /********** Load Styles **********/

    private _load() {
        forgetBaseStylesOnThemeChange();

        if (!Base.isStyleNameLoaded('base')) {
            this.baseStyle.loadBaseCSS(this.$styleOptions);

            Base.setLoadedStyleName('base');
        }

        // Outside the flag on purpose. `config.pt` is a signal an app can set at any time, and
        // `global.css` may be a function of the instance, so it is evaluated for every component,
        // as it always was. With no global CSS, the usual case, this writes nothing.
        this._loadGlobalStyles();

        this._loadThemeStyles();
    }

    private _loadStyles() {
        this._load();
        this._themeChangeListener('_load', () => this._load());
    }

    private _loadGlobalStyles() {
        const globalCSS = this._useGlobalPT(this._getOptionValue, 'global.css', this.$params);

        isNotEmpty(globalCSS) && this.baseStyle.load(globalCSS, { name: 'global', ...this.$styleOptions });
    }

    private _loadCoreStyles() {
        forgetBaseStylesOnThemeChange();

        // The name is read on its own: `$style` copies the whole style service, and this runs
        // for every component created, nearly always to find the stylesheet already loaded.
        const name = styleValue(this, 'name');

        if (!Base.isStyleNameLoaded(name) && name) {
            this.baseComponentStyle.loadCSS(this.$styleOptions);
            this.$style.loadCSS(this.$styleOptions);

            Base.setLoadedStyleName(this.$style.name);
        }
    }

    private _loadThemeStyles() {
        if (this.$unstyled() || this.config?.theme() === 'none') return;

        // common
        if (!Theme.isStyleNameLoaded('common')) {
            const { primitive, semantic, global, style } = this.$style?.getCommonTheme?.() || {};

            this.baseStyle.load(primitive?.css, { name: 'primitive-variables', ...this.$styleOptions });
            this.baseStyle.load(semantic?.css, { name: 'semantic-variables', ...this.$styleOptions });
            this.baseStyle.load(global?.css, { name: 'global-variables', ...this.$styleOptions });
            this.baseStyle.loadBaseStyle({ name: 'global-style', ...this.$styleOptions }, style);

            Theme.setLoadedStyleName('common');
        }

        // component
        const name = styleValue(this, 'name');

        if (!Theme.isStyleNameLoaded(name) && name) {
            const { css, style } = this.$style?.getComponentTheme?.() || {};

            this.$style?.load(css, { name: `${this.$style?.name}-variables`, ...this.$styleOptions });
            this.$style?.loadStyle({ name: `${this.$style?.name}-style`, ...this.$styleOptions }, style);

            Theme.setLoadedStyleName(this.$style?.name);
        }

        // layer order
        if (!Theme.isStyleNameLoaded('layer-order')) {
            const layerOrder = this.$style?.getLayerOrderThemeCSS?.();

            this.baseStyle.load(layerOrder, { name: 'layer-order', first: true, ...this.$styleOptions });
            Theme.setLoadedStyleName('layer-order');
        }
    }

    private _loadScopedThemeStyles(preset) {
        const { css } = this.$style?.getPresetTheme?.(preset, `[${this.$attrSelector}]`) || {};
        const scopedStyle = this.$style?.load(css, { name: `${this.$attrSelector}-${this.$style?.name}`, ...this.$styleOptions });

        this.scopedStyleEl = scopedStyle?.el;
    }

    private _unloadScopedThemeStyles() {
        this.scopedStyleEl?.remove();
    }

    private _themeChangeListener(id: string, callback = () => {}) {
        this._offThemeChangeListener(id);
        const hold = callback.bind(this);
        this.themeChangeListenerMap.set(id, hold);
        ThemeService.on('theme:change', hold);
    }

    private _removeThemeListeners() {
        this._offThemeChangeListener('_themeScopedListener');
        this._offThemeChangeListener('_loadCoreStyles');
        this._offThemeChangeListener('_load');
    }

    private _offThemeChangeListener(id: string) {
        if (this.themeChangeListenerMap.has(id)) {
            ThemeService.off('theme:change', this.themeChangeListenerMap.get(id));
            this.themeChangeListenerMap.delete(id);
        }
    }

    /********** Passthrough **********/

    private _getPTValue(obj = {}, key = '', params = {}, searchInDefaultPT = true) {
        const searchOut = /./g.test(key) && !!params[key.split('.')[0]];
        const { mergeSections = true, mergeProps: useMergeProps = false } = this._getPropValue('ptOptions')?.() || this.config?.['ptOptions']?.() || {};
        const global = searchInDefaultPT ? (searchOut ? this._useGlobalPT(this._getPTClassValue, key, params) : this._useDefaultPT(this._getPTClassValue, key, params)) : undefined;
        const self = searchOut ? undefined : this._usePT(this._getPT(obj, this.$hostName || this.$name), this._getPTClassValue, key, { ...params, global: global || {} });
        const datasets = this._getPTDatasets(key);

        return mergeSections || (!mergeSections && self) ? (useMergeProps ? this._mergeProps(useMergeProps, global, self, datasets) : { ...global, ...self, ...datasets }) : { ...self, ...datasets };
    }

    private _getPTDatasets(key = '') {
        if (key === 'transition') return false;

        // The last segment of a dotted key.
        if (key !== 'root') return (sectionDatasets[key] ??= Object.freeze({ [SECTION]: toFlatCase(key.split('.').pop() as string) }));

        const extendedSection = this.$pt()?.[SECTION];
        const isExtended = isNotEmpty(extendedSection);
        const datasets: Record<string, string> = { 'data-pc-name': toFlatCase(isExtended ? extendedSection : this.$name) };

        if (isExtended) datasets['data-pc-extend'] = toFlatCase(this.$name);
        datasets[this.$attrSelector] = ''; // @todo - use `data-pc-id: this.$attrSelector` instead.
        datasets[SECTION] = key;

        return datasets;
    }

    private _getPTClassValue(options?: any, key?: any, params?: any) {
        const value = this._getOptionValue(options, key, params);

        return isString(value) || isArray(value) ? { class: value } : value;
    }

    private _getPT(pt: any, key = '', callback?: any) {
        const getValue = (value, checkSameKey = false) => {
            const computedValue = callback ? callback(value) : value;
            const _key = toFlatCase(key);
            const _cKey = toFlatCase(this.$hostName || this.$name);

            return (checkSameKey ? (_key !== _cKey ? computedValue?.[_key] : undefined) : computedValue?.[_key]) ?? computedValue;
        };

        return pt?.hasOwnProperty('_usept')
            ? {
                  _usept: pt['_usept'],
                  originalValue: getValue(pt.originalValue),
                  value: getValue(pt.value)
              }
            : getValue(pt, true);
    }

    private _usePT(pt: any, callback: any, key: any, params?: any) {
        const fn = (value) => callback?.call(this, value, key, params);

        if (pt?.hasOwnProperty('_usept')) {
            const { mergeSections = true, mergeProps: useMergeProps = false } = pt['_usept'] || this.config?.['ptOptions']() || {};
            const originalValue = fn(pt.originalValue);
            const value = fn(pt.value);

            if (originalValue === undefined && value === undefined) return undefined;
            else if (isString(value)) return value;
            else if (isString(originalValue)) return originalValue;

            return mergeSections || (!mergeSections && value) ? (useMergeProps ? this._mergeProps(useMergeProps, originalValue, value) : { ...originalValue, ...value }) : value;
        }

        return fn(pt);
    }

    private _useGlobalPT(callback: any, key: any, params?: any) {
        return this._usePT(this.$globalPT, callback, key, params);
    }

    private _useDefaultPT(callback: any, key: any, params?: any) {
        return this._usePT(this.$defaultPT, callback, key, params);
    }

    /******************** Exposed API ********************/

    public ptm(key = '', params = {}) {
        // Nothing to merge: the result is the data attributes alone, as `_getPTValue` returns it.
        if (!hasPT(this)) return this._getPTDatasets(key) || {};

        return this._getPTValue(this.$pt() as any, key, { ...this.$params, ...params });
    }

    public ptms(keys: string[], params = {}) {
        return keys.reduce((acc, arg) => mergeProps(acc, this.ptm(arg, params)) || {}, {});
    }

    public ptmo(obj = {}, key = '', params = {}) {
        return this._getPTValue(obj, key, { instance: this, ...params }, false);
    }

    public cx(key: string, params = {}) {
        return !this.$unstyled() ? cn(optionValue(styleValue(this, 'classes'), key, Object.keys(params).length ? { ...this.$params, ...params } : this.$params)) : undefined;
    }

    public sx(key = '', when = true, params = {}) {
        if (when) {
            const self = this._getOptionValue(this.$style.inlineStyles, key, { ...this.$params, ...params }) as Record<string, any>;
            const base = this._getOptionValue(this.baseComponentStyle.inlineStyles, key, { ...this.$params, ...params }) as Record<string, any>;

            return { ...base, ...self };
        }

        return undefined;
    }
}
