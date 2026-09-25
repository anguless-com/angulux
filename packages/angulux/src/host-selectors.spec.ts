import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Checkbox } from '@anguless/angulux/checkbox';
import { provideAngulux } from '@anguless/angulux/config';
import { InputNumber } from '@anguless/angulux/inputnumber';
import { MultiSelect } from '@anguless/angulux/multiselect';
import { Password } from '@anguless/angulux/password';
import { RadioButton } from '@anguless/angulux/radiobutton';
import { ToggleSwitch } from '@anguless/angulux/toggleswitch';

/**
 * Stylesheet rules that select a component by its HOST ELEMENT NAME.
 *
 * WHY THIS FILE EXISTS. The rename to `agl-*` rewrote selectors in templates, specs and
 * `selector:` declarations, and left the CSS inside the style files alone — so every rule written
 * against a `p-*` host kept its old name and has matched nothing since. No gate reads CSS inside
 * a template literal, and a rule that matches nothing reports nothing. Only computing the style
 * of a rendered element can tell a live rule from a dead one, which is what these specs do.
 *
 * HOW. The rules colour through design tokens. No theme is loaded here, so each spec defines the
 * token it expects as a custom property with a colour of its own; the element takes that colour
 * only if the rule under test matched it.
 */

const TOKENS: Record<string, string> = {
    '--p-checkbox-invalid-border-color': 'rgb(1, 2, 3)',
    '--p-inputtext-invalid-border-color': 'rgb(4, 5, 6)',
    '--p-inputtext-invalid-placeholder-color': 'rgb(7, 8, 9)',
    '--p-multiselect-invalid-placeholder-color': 'rgb(10, 11, 12)',
    '--p-radiobutton-invalid-border-color': 'rgb(13, 14, 15)',
    '--p-toggleswitch-invalid-border-color': 'rgb(16, 17, 18)'
};

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [ReactiveFormsModule, Checkbox, InputNumber, MultiSelect, Password, RadioButton, ToggleSwitch],
    template: `
        <form [formGroup]="group">
            <agl-checkbox id="checkbox" formControlName="agree" [binary]="true" />
            <agl-inputnumber id="inputnumber" formControlName="amount" placeholder="Amount" />
            <agl-multiselect id="multiselect" formControlName="cities" [options]="options" placeholder="Cities" />
            <agl-password id="password" formControlName="secret" [feedback]="false" placeholder="Secret" />
            <agl-radiobutton id="radiobutton" formControlName="city" value="Rome" />
            <agl-toggleswitch id="toggleswitch" formControlName="on" />
        </form>
    `
})
class ReactiveFallbackHost {
    options = ['Rome', 'Paris'];

    group = new FormGroup({
        agree: new FormControl(false, Validators.requiredTrue),
        amount: new FormControl<number | null>(null, Validators.required),
        cities: new FormControl<string[]>([], Validators.required),
        secret: new FormControl('', Validators.required),
        city: new FormControl<string | null>(null, Validators.required),
        on: new FormControl(false, Validators.requiredTrue)
    });
}

/**
 * [element, pseudo-element or null, CSS property, token the rule colours it with] — one row per
 * rule the `ng-invalid.ng-dirty` fallback declares. The `:enabled:focus` variants are the same
 * selectors with focus on top. Each element is written from its host down, as the rule is.
 */
const FALLBACKS: [string, string | null, string, string][] = [
    ['#checkbox .p-checkbox-box', null, 'border-top-color', '--p-checkbox-invalid-border-color'],
    ['#inputnumber > input', null, 'border-top-color', '--p-inputtext-invalid-border-color'],
    ['#inputnumber > input', '::placeholder', 'color', '--p-inputtext-invalid-placeholder-color'],
    ['#multiselect .p-multiselect-label.p-placeholder', null, 'color', '--p-multiselect-invalid-placeholder-color'],
    ['#password input', null, 'border-top-color', '--p-inputtext-invalid-border-color'],
    ['#password input', '::placeholder', 'color', '--p-inputtext-invalid-placeholder-color'],
    ['#radiobutton .p-radiobutton-box', null, 'border-top-color', '--p-radiobutton-invalid-border-color'],
    ['#toggleswitch > .p-toggleswitch-slider', null, 'border-top-color', '--p-toggleswitch-invalid-border-color']
];

const HOSTS = ['checkbox', 'inputnumber', 'multiselect', 'password', 'radiobutton', 'toggleswitch'];

describe('Rules that select an agl-* host', () => {
    beforeEach(() => {
        for (const [name, value] of Object.entries(TOKENS)) document.documentElement.style.setProperty(name, value);
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideAngulux()] });
    });

    afterEach(() => {
        for (const name of Object.keys(TOKENS)) document.documentElement.style.removeProperty(name);
    });

    describe('the Reactive Forms invalid fallback (ng-invalid.ng-dirty on the host)', () => {
        let fixture: ComponentFixture<ReactiveFallbackHost>;

        /** What each row's element is painted with — or `absent`, which no expectation below accepts. */
        const paint = () =>
            FALLBACKS.map(([selector, pseudo, property]) => {
                const element = (fixture.nativeElement as HTMLElement).querySelector(selector);
                const value = element ? getComputedStyle(element, pseudo).getPropertyValue(property) : 'absent';

                return `${selector}${pseudo ?? ''} ${property}: ${value}`;
            });

        const tokenColours = () => FALLBACKS.map(([selector, pseudo, property, token]) => `${selector}${pseudo ?? ''} ${property}: ${TOKENS[token]}`);

        beforeEach(async () => {
            fixture = TestBed.createComponent(ReactiveFallbackHost);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('marks every host, not some inner element, with the form state classes', () => {
            for (const id of HOSTS) {
                expect((fixture.nativeElement as HTMLElement).querySelector(`#${id}`)!.classList).withContext(id).toContain('ng-invalid');
            }
        });

        it('leaves an invalid control that is still pristine alone', () => {
            const painted = paint();

            expect(painted.filter((row) => row.endsWith(': absent'))).toEqual([]);
            tokenColours().forEach((colour, i) => expect(painted[i]).not.toBe(colour));
        });

        it('paints an invalid control once it is dirty', async () => {
            fixture.componentInstance.group.markAllAsDirty();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(paint()).toEqual(tokenColours());
        });

        it('stops painting it when the value becomes valid', async () => {
            const { group } = fixture.componentInstance;
            group.markAllAsDirty();
            group.setValue({ agree: true, amount: 3, cities: ['Rome'], secret: 'opensesame', city: 'Rome', on: true });
            fixture.detectChanges();
            await fixture.whenStable();

            const painted = paint();

            expect(group.valid).toBeTrue();
            // Only the rules whose element is still there are asked: a valid MultiSelect shows a
            // label instead of its placeholder, so that row has nothing left to paint.
            FALLBACKS.forEach(([selector], i) => {
                if (selector.startsWith('#multiselect')) return;
                expect(painted[i]).withContext(selector).not.toBe(tokenColours()[i]);
            });
        });
    });
});
