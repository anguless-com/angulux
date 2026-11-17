import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Theme } from '@anguless/angulux-styled';
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
