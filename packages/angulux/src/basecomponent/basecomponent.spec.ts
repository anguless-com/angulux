import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Theme } from '@anguless/angulux-styled';
import { cn, getKeyValue } from '@anguless/angulux-utils';
import { AnguluxConfig, provideAngulux } from '@anguless/angulux/config';
import { Button } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { Tag } from '../tag/tag';

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [Button, Checkbox, Tag],
    template: `
        @for (i of items(); track i) {
            <agl-button [label]="'b' + i" />
            <agl-tag [value]="'t' + i" />
            <agl-checkbox [binary]="true" [inputId]="'cb' + i" />
        }
    `
})
class ManyComponents {
    items = signal<number[]>([0]);

    grow(n: number) {
        this.items.set(Array.from({ length: n }, (_, i) => i));
    }
}

/** The text of the base stylesheet, which names a variable through dt('scrollbar.width'). */
const baseStylesheet = () => document.querySelector('style[data-angulux-style-id="base"]')?.textContent ?? '';

/**
 * Style loading across component instances (#168, upstream 22.1.3 Core: "every new component
 * searches the whole document").
 *
 * Until 2026-11-17 every component cleared the record of which stylesheets were loaded when it
 * registered its theme listeners, so the next component wrote the base stylesheet again and asked
 * the document for its <style>: five lookups for each button, tag and checkbox, measured on Chrome.
 * The record is now forgotten only when the theme object changes. The second test holds the reason
 * the clearing existed: a theme change must still rewrite the stylesheets written through dt().
 */
describe('BaseComponent style loading', () => {
    // Theme is one module-level object shared by every spec in the run. This file changes its prefix,
    // so it puts the theme back the way it found it.
    const theme = Theme as unknown as { _theme: unknown; _tokens: unknown };
    let savedTheme: unknown;
    let savedTokens: unknown;

    beforeAll(() => {
        savedTheme = theme._theme;
        savedTokens = theme._tokens;
    });

    afterAll(() => {
        theme._theme = savedTheme;
        theme._tokens = savedTokens;
        Theme.clearLoadedStyleNames();
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideZonelessChangeDetection(), provideAngulux({ theme: { preset: {}, options: { prefix: 'p' } } })]
        });
    });

    it('does not write the base stylesheet again for components created after it', async () => {
        const fixture = TestBed.createComponent(ManyComponents);
        await fixture.whenStable();
        expect(baseStylesheet()).toContain('--p-scrollbar-width');

        const lookups = spyOn(document, 'querySelector').and.callThrough();
        fixture.componentInstance.grow(50);
        await fixture.whenStable();

        expect(fixture.nativeElement.querySelectorAll('agl-button').length).toBe(50);
        expect(fixture.nativeElement.querySelectorAll('agl-checkbox').length).toBe(50);
        const baseLookups = lookups.calls.allArgs().filter(([selector]) => String(selector).includes('data-angulux-style-id="base"'));
        expect(baseLookups.length).withContext('lookups of the base <style> while 147 components were created').toBe(0);
    });

    it('writes the base stylesheet again when the theme changes', async () => {
        const fixture = TestBed.createComponent(ManyComponents);
        fixture.componentInstance.grow(3);
        await fixture.whenStable();
        expect(baseStylesheet()).toContain('--p-scrollbar-width');

        TestBed.inject(AnguluxConfig).theme.set({ preset: {}, options: { prefix: 'q' } });
        await fixture.whenStable();

        expect(baseStylesheet()).toContain('--q-scrollbar-width');
        expect(baseStylesheet()).not.toContain('--p-scrollbar-width');
    });
});

/*
 * The shortcuts BaseComponent takes on every check since 22.6.10: `cx()` reads the class table
 * without copying the style service, and `ptm()` skips the pass-through resolution when neither
 * the component nor the application configured any. Each is held here to the long way it replaced.
 */
/** The members of a component these tests reach, most of them private. */
interface Internals {
    $name: string;
    $params: object;
    $style: { classes: Record<string, unknown> };
    _componentStyle: { classes: Record<string, unknown> };
    $pt(): unknown;
    cx(key: string, params?: object): string | undefined;
    ptm(key: string): Record<string, unknown>;
    _getPTValue(pt: unknown, key: string, params: object): Record<string, unknown>;
}

describe('BaseComponent shortcuts', () => {
    const create = (providers: unknown[] = []) => {
        TestBed.configureTestingModule({ imports: [ManyComponents], providers: [provideZonelessChangeDetection(), ...(providers as [])] });
        const fixture = TestBed.createComponent(ManyComponents);
        fixture.detectChanges();
        const instances = [Button, Tag, Checkbox].map((type) => fixture.debugElement.query(By.directive(type)).componentInstance as Internals);
        return { fixture, instances };
    };

    it('cx() returns what getKeyValue finds in $style.classes, for every key and spelling', () => {
        const { instances } = create();
        let compared = 0;

        for (const instance of instances) {
            const classes = instance.$style.classes;
            const keys = [...Object.keys(classes), ...Object.keys(classes).map((key) => key.toUpperCase()), 'missing', 'a.b', ''];

            for (const key of keys) {
                expect(instance.cx(key)).withContext(`${instance.$name} ${key}`).toEqual(cn(getKeyValue(classes, key, instance.$params)));
                compared += 1;
            }
        }

        expect(compared).toBeGreaterThan(20);
    });

    it('cx() passes the extra params on', () => {
        const { instances } = create();
        const [button] = instances;
        const seen: unknown[] = [];

        button._componentStyle.classes = { ...button._componentStyle.classes, probe: (params: unknown) => (seen.push(params), 'probe-class') };

        expect(button.cx('probe', { extra: 1 })).toBe('probe-class');
        expect(seen.length).toBeGreaterThan(0);
        expect((seen[0] as { extra: number; instance: unknown }).extra).toBe(1);
        expect((seen[0] as { extra: number; instance: unknown }).instance).toBe(button);
    });

    it('ptm() without any pass-through returns what the full resolution returns', () => {
        const { instances } = create();

        for (const instance of instances) {
            for (const key of ['root', 'label', 'pcBadge', 'input.box-icon', 'transition', '']) {
                expect(instance.ptm(key)).withContext(`${instance.$name} ${key}`).toEqual(instance._getPTValue(undefined, key, { ...instance.$params }));
            }
        }

        expect(instances[0].ptm('root')['data-pc-name']).toBe('button');
        expect(instances[0].ptm('label')).toEqual({ 'data-pc-section': 'label' });
    });

    it('ptm() sees a pass-through the application sets later', () => {
        const { instances } = create();
        const [button] = instances;

        expect(button.ptm('root')['data-probe']).toBeUndefined();

        TestBed.inject(AnguluxConfig).pt.set({ button: { root: { 'data-probe': 'app' } } } as never);

        expect(button.ptm('root')['data-probe']).toBe('app');
        expect(button.ptm('root')).toEqual(button._getPTValue(button.$pt(), 'root', { ...button.$params }));
    });

    it('a hook given through the application pass-through still runs', () => {
        const calls: string[] = [];
        const { fixture } = create([
            provideAngulux({
                pt: {
                    tag: {
                        hooks: {
                            onAfterViewChecked: () => {
                                calls.push('checked');
                            }
                        }
                    }
                }
            } as never)
        ]);

        fixture.detectChanges();

        expect(calls.length).toBeGreaterThan(0);
    });
});
