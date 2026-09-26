import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbstractControl, FormControl, FormGroup, FormsModule, NgModel, ReactiveFormsModule, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { Checkbox } from '@anguless/angulux/checkbox';
import { ColorPicker } from '@anguless/angulux/colorpicker';
import { provideAngulux } from '@anguless/angulux/config';
import { DatePicker } from '@anguless/angulux/datepicker';
import { InputNumber } from '@anguless/angulux/inputnumber';
import { InputText } from '@anguless/angulux/inputtext';
import { MultiSelect } from '@anguless/angulux/multiselect';
import { Password, PasswordDirective } from '@anguless/angulux/password';
import { RadioButton } from '@anguless/angulux/radiobutton';
import { Select } from '@anguless/angulux/select';
import { SelectButton } from '@anguless/angulux/selectbutton';
import { Textarea } from '@anguless/angulux/textarea';
import { ToggleButton } from '@anguless/angulux/togglebutton';
import { ToggleSwitch } from '@anguless/angulux/toggleswitch';

/**
 * Reactive Forms and ngModel on every form control, with nothing bound to `[invalid]` or
 * `[required]`.
 *
 * WHAT IT PINS. A control bound through `formControlName`, `[formControl]` or `ngModel` reports the
 * state of that forms control on its own: the invalid style and `aria-invalid` once the control is
 * touched or dirty — the rule `[formField]` follows, and the one an error message gated on
 * `touched` follows — and `required` / `aria-required` while the control carries
 * `Validators.required` or `requiredTrue`. Before this, a CSS fallback on `.ng-invalid.ng-dirty`
 * painted such a control red and nothing told a screen reader, which is the gap a sighted user
 * and a screen-reader user were left on opposite sides of.
 *
 * WHY NOTHING HERE FORCES A CHANGE-DETECTION PASS AFTER A CHANGE. The suite runs zoneless, like an
 * application without zone.js, and Angular reads a control's `invalid`, `touched` and `dirty`
 * untracked. Every change below is made in code, away from any template listener, and reaches
 * the DOM only if the control's own events notified the view. `fixture.detectChanges()` would
 * render it anyway and hide exactly the failure this file exists to catch.
 */

const OPTIONS = ['Rome', 'Paris'];

@Component({
    imports: [ReactiveFormsModule, InputNumber, DatePicker, Select, MultiSelect, Checkbox, RadioButton, ToggleSwitch, ToggleButton, SelectButton, ColorPicker, Password, PasswordDirective, InputText, Textarea],
    template: `
        <form [formGroup]="group">
            <agl-inputnumber id="inputnumber" formControlName="inputnumber" />
            <agl-datepicker id="datepicker" formControlName="datepicker" />
            <agl-select id="select" formControlName="select" [options]="options" />
            <agl-multiselect id="multiselect" formControlName="multiselect" [options]="options" />
            <agl-checkbox id="checkbox" formControlName="checkbox" [binary]="true" />
            <agl-radiobutton id="radiobutton" formControlName="radiobutton" value="Rome" />
            <agl-toggleswitch id="toggleswitch" formControlName="toggleswitch" />
            <agl-togglebutton id="togglebutton" formControlName="togglebutton" />
            <agl-selectbutton id="selectbutton" formControlName="selectbutton" [options]="options" />
            <agl-colorpicker id="colorpicker" formControlName="colorpicker" />
            <agl-password id="password" formControlName="password" [feedback]="false" />
            <input id="passworddirective" type="password" aglPassword formControlName="passworddirective" [feedback]="false" />
            <input id="inputtext" aglInputText formControlName="inputtext" />
            <textarea id="textarea" aglTextarea formControlName="textarea"></textarea>
        </form>
    `
})
class ReactiveHost {
    options = OPTIONS;
    group = new FormGroup({
        inputnumber: new FormControl<number | null>(null, Validators.required),
        datepicker: new FormControl<Date | null>(null, Validators.required),
        select: new FormControl<string | null>(null, Validators.required),
        multiselect: new FormControl<string[]>([], Validators.required),
        checkbox: new FormControl(false, Validators.requiredTrue),
        radiobutton: new FormControl<string | null>(null, Validators.required),
        toggleswitch: new FormControl(false, Validators.requiredTrue),
        togglebutton: new FormControl(false, Validators.requiredTrue),
        selectbutton: new FormControl<string | null>(null, Validators.required),
        colorpicker: new FormControl<string | null>(null, Validators.required),
        password: new FormControl('', Validators.required),
        passworddirective: new FormControl('', Validators.required),
        inputtext: new FormControl('', Validators.required),
        textarea: new FormControl('', Validators.required)
    });
}

/**
 * [id, element carrying p-invalid (null: the control has none), element carrying aria-invalid,
 * [element, attribute] announcing required (null: the control renders none)]. ':scope' is the
 * control's own host element; the id is also the name of its control in the group.
 */
const ROWS: [string, string | null, string, [string, string] | null][] = [
    ['inputnumber', ':scope', 'input', ['input', 'required']],
    ['datepicker', ':scope', 'input', ['input', 'required']],
    ['select', ':scope', '[role="combobox"]', ['[role="combobox"]', 'aria-required']],
    ['multiselect', ':scope', 'input[role="combobox"]', ['input[role="combobox"]', 'required']],
    ['checkbox', ':scope', 'input', ['input', 'required']],
    ['radiobutton', ':scope', 'input', ['input', 'required']],
    ['toggleswitch', ':scope', 'input', ['input', 'required']],
    ['togglebutton', ':scope', ':scope', null],
    ['selectbutton', ':scope', ':scope', null],
    ['colorpicker', null, 'input', null],
    ['password', 'input', 'input', ['input', 'required']],
    ['passworddirective', null, ':scope', [':scope', 'aria-required']],
    ['inputtext', ':scope', ':scope', [':scope', 'aria-required']],
    ['textarea', ':scope', ':scope', [':scope', 'aria-required']]
];

const el = (root: HTMLElement, selector: string) => {
    const found = root.querySelector<HTMLElement>(selector);

    if (!found) throw new Error(`the fixture rendered no ${selector}`);

    return found;
};

const find = (root: HTMLElement, id: string, selector: string) => {
    const host = el(root, `#${id}`);

    return selector === ':scope' ? host : el(host, selector);
};

/** Waits for what the application would render on its own. Never forces a pass. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    await fixture.whenStable();
    await fixture.whenStable();
}

async function render<T>(host: new (...args: never[]) => T): Promise<ComponentFixture<T>> {
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await settle(fixture);

    return fixture;
}

const shown = (root: HTMLElement, [id, styled, focusable]: (typeof ROWS)[number]) => ({
    styled: styled ? find(root, id, styled).classList.contains('p-invalid') : null,
    aria: find(root, id, focusable).getAttribute('aria-invalid')
});

const NOT_SHOWN = ([, styled]: (typeof ROWS)[number]) => ({ styled: styled ? false : null, aria: null });
const SHOWN = ([, styled]: (typeof ROWS)[number]) => ({ styled: styled ? true : null, aria: 'true' });

describe('Reactive Forms state on every form control, with nothing bound', () => {
    let fixture: ComponentFixture<ReactiveHost>;
    let root: HTMLElement;
    const control = (id: string): AbstractControl => fixture.componentInstance.group.get(id)!;

    beforeEach(async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideAngulux()] });
        fixture = await render(ReactiveHost);
        root = fixture.nativeElement;
    });

    for (const row of ROWS) {
        const [id, , , announcesRequired] = row;

        describe(id, () => {
            it('shows no invalid state while its control is untouched and pristine, although the control is invalid', () => {
                expect(control(id).invalid).toBeTrue();
                expect(shown(root, row)).toEqual(NOT_SHOWN(row));
            });

            it('shows the invalid state and aria-invalid once its control is marked touched in code', async () => {
                control(id).markAsTouched();
                await settle(fixture);

                expect(shown(root, row)).toEqual(SHOWN(row));
            });

            it('shows them once its control is marked dirty in code', async () => {
                control(id).markAsDirty();
                await settle(fixture);

                expect(shown(root, row)).toEqual(SHOWN(row));
            });

            it('clears them when its control becomes valid', async () => {
                control(id).markAsTouched();
                await settle(fixture);

                control(id).clearValidators();
                control(id).updateValueAndValidity();
                await settle(fixture);

                expect(control(id).valid).toBeTrue();
                expect(shown(root, row)).toEqual(NOT_SHOWN(row));
            });

            it('clears them on reset(), while its control stays invalid', async () => {
                control(id).markAsTouched();
                control(id).markAsDirty();
                await settle(fixture);
                expect(shown(root, row)).toEqual(SHOWN(row));

                fixture.componentInstance.group.reset();
                await settle(fixture);

                expect(control(id).invalid).toBeTrue();
                expect(shown(root, row)).toEqual(NOT_SHOWN(row));
            });

            if (announcesRequired) {
                const [selector, attribute] = announcesRequired;

                it(`announces required through ${attribute} while its control requires a value, and follows a validator swap`, async () => {
                    expect(find(root, id, selector).hasAttribute(attribute)).toBeTrue();

                    control(id).clearValidators();
                    control(id).updateValueAndValidity();
                    await settle(fixture);
                    expect(find(root, id, selector).hasAttribute(attribute)).toBeFalse();

                    control(id).setValidators(id === 'checkbox' || id === 'toggleswitch' ? Validators.requiredTrue : Validators.required);
                    control(id).updateValueAndValidity();
                    await settle(fixture);
                    expect(find(root, id, selector).hasAttribute(attribute)).toBeTrue();
                });
            }
        });
    }
});

@Component({
    imports: [ReactiveFormsModule, Select, InputText],
    template: `
        <agl-select id="select" [formControl]="control" [options]="options" [invalid]="invalid()" [required]="required()" />
        <input id="inputtext" aglInputText [formControl]="control" [invalid]="invalid()" />
    `
})
class BoundHost {
    options = OPTIONS;
    control = new FormControl<string | null>(null, Validators.required);
    invalid = signal(false);
    required = signal(false);
}

@Component({
    imports: [ReactiveFormsModule, Select],
    template: `<agl-select id="select" [formControl]="current()" [options]="options" />`
})
class SwapHost {
    options = OPTIONS;
    first = new FormControl<string | null>('Rome', Validators.required);
    second = new FormControl<string | null>(null, Validators.required);
    current = signal(this.first);
}

@Component({
    imports: [FormsModule, Select, InputText],
    template: `
        <agl-select id="select" name="city" [(ngModel)]="city" [options]="options" required />
        <input id="inputtext" aglInputText name="note" [(ngModel)]="note" required />
    `
})
class NgModelHost {
    options = OPTIONS;
    city: string | null = null;
    note = '';
}

@Component({
    imports: [ReactiveFormsModule, InputText],
    template: `<input id="inputtext" aglInputText [formControl]="control" aria-required="true" />`
})
class HandWrittenHost {
    control = new FormControl('');
}

describe('Reactive Forms state, next to what the template says', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideAngulux()] });
    });

    // A binding cannot be taken away at run time, and `[invalid]="undefined"` still passes through
    // booleanAttribute as false, so "bound" is decided by the template, once.
    it('lets a bound [invalid] and [required] win over the control, even when they say false', async () => {
        const fixture = await render(BoundHost);
        const root = fixture.nativeElement as HTMLElement;
        const combobox = find(root, 'select', '[role="combobox"]');
        const input = find(root, 'inputtext', ':scope');

        fixture.componentInstance.control.markAsTouched();
        await settle(fixture);

        expect(fixture.componentInstance.control.invalid).toBeTrue();
        expect(combobox.getAttribute('aria-invalid')).toBeNull();
        expect(input.getAttribute('aria-invalid')).toBeNull();
        expect(combobox.getAttribute('aria-required')).toBe('false');

        fixture.componentInstance.invalid.set(true);
        fixture.componentInstance.required.set(true);
        fixture.componentInstance.control.setValue('Rome');
        await settle(fixture);

        expect(fixture.componentInstance.control.valid).toBeTrue();
        expect(combobox.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(combobox.getAttribute('aria-required')).toBe('true');
    });

    it('follows the control that [formControl] points at now, not the first one', async () => {
        const fixture = await render(SwapHost);
        const combobox = find(fixture.nativeElement, 'select', '[role="combobox"]');
        expect(combobox.getAttribute('aria-invalid')).toBeNull();

        fixture.componentInstance.second.markAsTouched();
        fixture.componentInstance.current.set(fixture.componentInstance.second);
        await settle(fixture);
        expect(combobox.getAttribute('aria-invalid')).toBe('true');

        // The first control no longer speaks for the element.
        fixture.componentInstance.first.setValue(null);
        fixture.componentInstance.first.markAsTouched();
        fixture.componentInstance.second.setValue('Paris');
        await settle(fixture);
        expect(combobox.getAttribute('aria-invalid')).toBeNull();
    });

    it('does the same under ngModel', async () => {
        const fixture = await render(NgModelHost);
        const root = fixture.nativeElement as HTMLElement;
        const models = fixture.debugElement.queryAll(By.directive(NgModel)).map((node) => node.injector.get(NgModel));
        expect(models.length).toBe(2);

        expect(find(root, 'select', '[role="combobox"]').getAttribute('aria-invalid')).toBeNull();

        for (const model of models) model.control.markAsTouched();
        await settle(fixture);

        expect(models.every((model) => model.invalid)).toBeTrue();
        expect(find(root, 'select', '[role="combobox"]').getAttribute('aria-invalid')).toBe('true');
        expect(find(root, 'inputtext', ':scope').getAttribute('aria-invalid')).toBe('true');
    });

    it('leaves an aria-required written on a native element by hand alone', async () => {
        const fixture = await render(HandWrittenHost);
        const input = find(fixture.nativeElement, 'inputtext', ':scope');

        expect(fixture.componentInstance.control.hasValidator(Validators.required)).toBeFalse();
        expect(input.getAttribute('aria-required')).toBe('true');

        fixture.componentInstance.control.setValidators(Validators.required);
        fixture.componentInstance.control.updateValueAndValidity();
        await settle(fixture);
        fixture.componentInstance.control.clearValidators();
        fixture.componentInstance.control.updateValueAndValidity();
        await settle(fixture);

        expect(input.getAttribute('aria-required')).toBe('true');
    });
});
