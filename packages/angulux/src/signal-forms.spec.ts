import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal, Type, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { disabled, FieldTree, form, FormField, minLength, required, submit } from '@angular/forms/signals';
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
import { settled } from './spec-helpers';

/**
 * Signal Forms' `[formField]` on every form control this library ships.
 *
 * WHY ONE FILE AND NOT FIFTEEN. The contract under test belongs to the base classes, not to any
 * one control: `[formField]` writes a field's state into every input of the element that
 * carries the matching NAME — `invalid`, `touched`, `dirty`, `required`, `disabled`, `name`,
 * `min`, `max`, `pattern` — and the controls inherit those inputs. A table keeps every control
 * asked the same questions, and a promoted module is one more row rather than one more copy.
 *
 * WHAT A ROW HAS TO SAY. Where the invalid style lands, which element a keyboard reaches (it
 * carries `aria-invalid`), how the control is touched and how a user commits a value. Those
 * differ per control, and guessing them is how a test ends up asserting on the wrong element and
 * passing for that reason.
 */

const OPTIONS = ['Rome', 'Paris'];

interface FieldHost {
    model: WritableSignal<{ answer: any }>;
    f: FieldTree<{ answer: any }>;
    off: WritableSignal<boolean>;
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, InputNumber],
    template: `<agl-inputnumber [formField]="f.answer" />`
})
class InputNumberHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: null as number | null });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, DatePicker],
    template: `<agl-datepicker [formField]="f.answer" dateFormat="yy-mm-dd" />`
})
class DatePickerHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: null as Date | null });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, Select],
    template: `<agl-select [formField]="f.answer" [options]="options" />`
})
class SelectHost implements FieldHost {
    options = OPTIONS;
    off = signal(false);
    model = signal({ answer: null as string | null });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, MultiSelect],
    template: `<agl-multiselect [formField]="f.answer" [options]="options" />`
})
class MultiSelectHost implements FieldHost {
    options = OPTIONS;
    off = signal(false);
    model = signal({ answer: [] as string[] });
    // Signal Forms counts an empty array as a value, so "pick at least one" is a length rule.
    f = form(this.model, (p) => {
        minLength(p.answer, 1);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, Checkbox],
    template: `<agl-checkbox [formField]="f.answer" [binary]="true" />`
})
class CheckboxHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: false });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, Checkbox],
    template: `<agl-checkbox [formField]="f.answer" value="Rome" />`
})
class CheckboxGroupHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: [] as string[] });
    f = form(this.model, (p) => {
        minLength(p.answer, 1);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, RadioButton],
    template: `
        <agl-radiobutton [formField]="f.answer" value="Rome" />
        <agl-radiobutton [formField]="f.answer" value="Paris" />
    `
})
class RadioButtonHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: null as string | null });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, ToggleSwitch],
    template: `<agl-toggleswitch [formField]="f.answer" />`
})
class ToggleSwitchHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: false });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, ToggleButton],
    template: `<agl-togglebutton [formField]="f.answer" onLabel="On" offLabel="Off" />`
})
class ToggleButtonHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: false });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, SelectButton],
    template: `<agl-selectbutton [formField]="f.answer" [options]="options" />`
})
class SelectButtonHost implements FieldHost {
    options = OPTIONS;
    off = signal(false);
    model = signal({ answer: null as string | null });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, ColorPicker],
    template: `<agl-colorpicker [formField]="f.answer" />`
})
class ColorPickerHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: '' });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, Password],
    template: `<agl-password [formField]="f.answer" [feedback]="false" />`
})
class PasswordHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: '' });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, PasswordDirective],
    template: `<input type="password" aglPassword [feedback]="false" [formField]="f.answer" />`
})
class PasswordDirectiveHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: '' });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, InputText],
    template: `<input aglInputText [formField]="f.answer" />`
})
class InputTextHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: '' });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, Textarea],
    template: `<textarea aglTextarea [autoResize]="true" [formField]="f.answer"></textarea>`
})
class TextareaHost implements FieldHost {
    off = signal(false);
    model = signal({ answer: '' });
    f = form(this.model, (p) => {
        required(p.answer);
        disabled(p.answer, { when: () => this.off() });
    });
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormField, Select],
    template: `<agl-select [formField]="f.answer" [options]="options" [editable]="true" />`
})
class EditableSelectHost {
    options = OPTIONS;
    model = signal({ answer: '' });
    f = form(this.model, (p) => required(p.answer));
}

@Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [ReactiveFormsModule, InputNumber, DatePicker, Select, MultiSelect, Checkbox, RadioButton, ToggleSwitch, ToggleButton, SelectButton, ColorPicker, Password, PasswordDirective, InputText, Textarea],
    template: `
        <form [formGroup]="group">
            <agl-inputnumber id="inputnumber" formControlName="amount" [invalid]="invalid()" />
            <agl-datepicker id="datepicker" formControlName="when" [invalid]="invalid()" />
            <agl-select id="select" formControlName="city" [options]="options" [invalid]="invalid()" />
            <agl-multiselect id="multiselect" formControlName="cities" [options]="options" [invalid]="invalid()" />
            <agl-checkbox id="checkbox" formControlName="agree" [binary]="true" [invalid]="invalid()" />
            <agl-radiobutton id="radiobutton" formControlName="city" value="Rome" [invalid]="invalid()" />
            <agl-toggleswitch id="toggleswitch" formControlName="agree" [invalid]="invalid()" />
            <agl-togglebutton id="togglebutton" formControlName="agree" [invalid]="invalid()" />
            <agl-selectbutton id="selectbutton" formControlName="city" [options]="options" [invalid]="invalid()" />
            <agl-colorpicker id="colorpicker" formControlName="color" [invalid]="invalid()" />
            <agl-password id="password" formControlName="secret" [feedback]="false" [invalid]="invalid()" />
            <input id="passworddirective" type="password" aglPassword formControlName="secret" [feedback]="false" [invalid]="invalid()" />
            <input id="inputtext" aglInputText formControlName="name" [invalid]="invalid()" />
            <textarea id="textarea" aglTextarea formControlName="note" [invalid]="invalid()"></textarea>
        </form>
    `
})
class ReactiveInvalidHost {
    options = OPTIONS;
    invalid = signal(true);
    group = new FormGroup({
        amount: new FormControl<number | null>(null),
        when: new FormControl<Date | null>(null),
        city: new FormControl<string | null>(null),
        cities: new FormControl<string[]>([]),
        agree: new FormControl(false),
        color: new FormControl(''),
        secret: new FormControl(''),
        name: new FormControl(''),
        note: new FormControl('')
    });
}

type Fixture = ComponentFixture<FieldHost>;

const el = (root: HTMLElement, selector: string) => {
    const found = root.querySelector<HTMLElement>(selector);

    if (!found) throw new Error(`the fixture rendered no ${selector}`);

    return found;
};

const instanceOf = <T>(fixture: Fixture, type: Type<T>): T => fixture.debugElement.query(By.directive(type)).injector.get(type);

/** Type into a native input the way a browser reports it: the value lands, then `input` fires. */
const typeInto = (input: HTMLElement, text: string) => {
    (input as HTMLInputElement).value = text;
    input.dispatchEvent(new Event('input'));
};

/**
 * Settle, then check once more. SelectButton hands its selection to its buttons through
 * `[ngModel]`, which writes a microtask after the pass that changed it; the second pass is what
 * renders that write.
 */
async function stable(fixture: ComponentFixture<unknown>): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
}

interface Case {
    name: string;
    host: Type<FieldHost>;
    /** The element whose class list carries `p-invalid`; null for a control that has no invalid style. */
    styled: ((root: HTMLElement) => HTMLElement) | null;
    /** The element a keyboard user lands on. It carries `aria-invalid`. */
    focusable: (root: HTMLElement) => HTMLElement;
    /** Which state attributes the control renders on its focusable element. */
    renders: { name: boolean; required: boolean; disabled: boolean };
    /** For a control with no native element to carry `disabled`: how it shows the state instead. */
    showsDisabled?: (root: HTMLElement) => boolean;
    /**
     * How a user touches the control. `form` is for controls with no touch gesture of their own
     * that leaves the value alone — a toggle button is touched by the click that changes it.
     */
    touch: 'blur' | 'focus' | 'form';
    /** A value that satisfies the field, written from the model side. */
    valid: unknown;
    /** Asserts that the control shows `valid`. */
    shows: (root: HTMLElement, fixture: Fixture) => void;
    /** Commits a value the way a user does, and resolves to what the model must then hold. */
    commit: (root: HTMLElement, fixture: Fixture) => Promise<unknown>;
}

const CASES: Case[] = [
    {
        name: 'InputNumber',
        host: InputNumberHost,
        styled: (root) => el(root, 'agl-inputnumber'),
        focusable: (root) => el(root, 'agl-inputnumber input'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: 42,
        shows: (root) => expect((el(root, 'agl-inputnumber input') as HTMLInputElement).value).toBe('42'),
        commit: async (root) => {
            const input = el(root, 'agl-inputnumber input') as HTMLInputElement;
            input.value = '7';
            input.dispatchEvent(new Event('blur'));
            return 7;
        }
    },
    {
        name: 'DatePicker',
        host: DatePickerHost,
        styled: (root) => el(root, 'agl-datepicker'),
        focusable: (root) => el(root, 'agl-datepicker input'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: new Date(2024, 0, 15),
        shows: (root) => expect((el(root, 'agl-datepicker input') as HTMLInputElement).value).toBe('2024-01-15'),
        commit: async (root) => {
            const input = el(root, 'agl-datepicker input');
            input.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
            typeInto(input, '2024-03-05');
            return new Date(2024, 2, 5);
        }
    },
    {
        name: 'Select',
        host: SelectHost,
        styled: (root) => el(root, 'agl-select'),
        focusable: (root) => el(root, 'agl-select [role="combobox"]'),
        // The non-editable label is a span: it can carry required/disabled, but a name belongs to a
        // form-submitted input and Select renders none here.
        renders: { name: false, required: true, disabled: true },
        touch: 'blur',
        valid: 'Paris',
        shows: (root) => expect(el(root, 'agl-select [role="combobox"]').textContent!.trim()).toBe('Paris'),
        commit: async (root, fixture) => {
            instanceOf(fixture, Select).onOptionSelect(new Event('click'), 'Rome');
            return 'Rome';
        }
    },
    {
        name: 'MultiSelect',
        host: MultiSelectHost,
        styled: (root) => el(root, 'agl-multiselect'),
        focusable: (root) => el(root, 'agl-multiselect input[role="combobox"]'),
        renders: { name: true, required: false, disabled: true },
        touch: 'blur',
        valid: ['Paris'],
        shows: (root) => expect(el(root, 'agl-multiselect .p-multiselect-label').textContent!.trim()).toBe('Paris'),
        commit: async (root, fixture) => {
            instanceOf(fixture, MultiSelect).onOptionSelect({ originalEvent: new Event('click'), option: 'Rome' });
            return ['Rome'];
        }
    },
    {
        name: 'Checkbox (binary)',
        host: CheckboxHost,
        styled: (root) => el(root, 'agl-checkbox'),
        focusable: (root) => el(root, 'agl-checkbox input'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: true,
        shows: (root) => expect((el(root, 'agl-checkbox input') as HTMLInputElement).checked).toBeTrue(),
        commit: async (root) => {
            el(root, 'agl-checkbox input').click();
            return true;
        }
    },
    {
        name: 'Checkbox (group)',
        host: CheckboxGroupHost,
        styled: (root) => el(root, 'agl-checkbox'),
        focusable: (root) => el(root, 'agl-checkbox input'),
        renders: { name: true, required: false, disabled: true },
        touch: 'blur',
        valid: ['Rome'],
        shows: (root) => expect((el(root, 'agl-checkbox input') as HTMLInputElement).checked).toBeTrue(),
        commit: async (root) => {
            el(root, 'agl-checkbox input').click();
            return ['Rome'];
        }
    },
    {
        name: 'RadioButton',
        host: RadioButtonHost,
        styled: (root) => el(root, 'agl-radiobutton'),
        focusable: (root) => el(root, 'agl-radiobutton input'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: 'Paris',
        shows: (root) => {
            const [rome, paris] = Array.from(root.querySelectorAll<HTMLInputElement>('agl-radiobutton input'));
            expect([rome.checked, paris.checked]).toEqual([false, true]);
        },
        commit: async (root) => {
            el(root, 'agl-radiobutton input').click();
            return 'Rome';
        }
    },
    {
        name: 'ToggleSwitch',
        host: ToggleSwitchHost,
        styled: (root) => el(root, 'agl-toggleswitch'),
        focusable: (root) => el(root, 'agl-toggleswitch input'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: true,
        shows: (root) => expect((el(root, 'agl-toggleswitch input') as HTMLInputElement).checked).toBeTrue(),
        commit: async (root) => {
            el(root, 'agl-toggleswitch').click();
            return true;
        }
    },
    {
        name: 'ToggleButton',
        host: ToggleButtonHost,
        styled: (root) => el(root, 'agl-togglebutton'),
        focusable: (root) => el(root, 'agl-togglebutton'),
        renders: { name: false, required: false, disabled: false },
        showsDisabled: (root) => el(root, 'agl-togglebutton').classList.contains('p-disabled'),
        touch: 'form',
        valid: true,
        shows: (root) => expect(el(root, 'agl-togglebutton').getAttribute('aria-pressed')).toBe('true'),
        commit: async (root) => {
            el(root, 'agl-togglebutton').click();
            return true;
        }
    },
    {
        name: 'SelectButton',
        host: SelectButtonHost,
        styled: (root) => el(root, 'agl-selectbutton'),
        // The group carries the state: its buttons are the options, not the field.
        focusable: (root) => el(root, 'agl-selectbutton'),
        renders: { name: false, required: false, disabled: false },
        showsDisabled: (root) => Array.from(root.querySelectorAll('agl-selectbutton agl-togglebutton')).every((b) => b.classList.contains('p-disabled')),
        touch: 'form',
        valid: 'Paris',
        shows: (root) => {
            const pressed = Array.from(root.querySelectorAll('agl-selectbutton agl-togglebutton')).map((b) => b.getAttribute('aria-pressed'));
            expect(pressed).toEqual(['false', 'true']);
        },
        commit: async (root) => {
            el(root, 'agl-selectbutton agl-togglebutton').click();
            return 'Rome';
        }
    },
    {
        name: 'ColorPicker',
        host: ColorPickerHost,
        // ColorPicker has never had an invalid style; it gets the ARIA state and nothing else.
        styled: null,
        focusable: (root) => el(root, 'agl-colorpicker input'),
        renders: { name: false, required: false, disabled: true },
        touch: 'focus',
        valid: '#00ff00',
        shows: (root) => expect(el(root, 'agl-colorpicker input').style.backgroundColor).toBe('rgb(0, 255, 0)'),
        commit: async (root, fixture) => {
            el(root, 'agl-colorpicker input').click();
            await settled(fixture);
            const selector = el(root, 'agl-colorpicker .p-colorpicker-color-selector');
            const box = selector.getBoundingClientRect();
            selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: box.left + 10, clientY: box.top + 10 }));
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            return jasmine.stringMatching(/^#[0-9a-f]{6}$/);
        }
    },
    {
        name: 'Password',
        host: PasswordHost,
        styled: (root) => el(root, 'agl-password input'),
        focusable: (root) => el(root, 'agl-password input'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: 'opensesame',
        shows: (root) => expect((el(root, 'agl-password input') as HTMLInputElement).value).toBe('opensesame'),
        commit: async (root) => {
            typeInto(el(root, 'agl-password input'), 'swordfish');
            return 'swordfish';
        }
    },
    {
        name: 'PasswordDirective',
        host: PasswordDirectiveHost,
        // The directive paints no invalid class of its own; aglInputText beside it would.
        styled: null,
        focusable: (root) => el(root, 'input[aglPassword]'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: 'opensesame',
        shows: (root) => expect((el(root, 'input[aglPassword]') as HTMLInputElement).value).toBe('opensesame'),
        commit: async (root) => {
            typeInto(el(root, 'input[aglPassword]'), 'swordfish');
            return 'swordfish';
        }
    },
    {
        name: 'InputText',
        host: InputTextHost,
        styled: (root) => el(root, 'input[aglInputText]'),
        focusable: (root) => el(root, 'input[aglInputText]'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: 'Ada',
        shows: (root) => expect((el(root, 'input[aglInputText]') as HTMLInputElement).value).toBe('Ada'),
        commit: async (root) => {
            typeInto(el(root, 'input[aglInputText]'), 'Grace');
            return 'Grace';
        }
    },
    {
        name: 'Textarea',
        host: TextareaHost,
        styled: (root) => el(root, 'textarea'),
        focusable: (root) => el(root, 'textarea'),
        renders: { name: true, required: true, disabled: true },
        touch: 'blur',
        valid: 'Ada',
        shows: (root) => expect((el(root, 'textarea') as HTMLTextAreaElement).value).toBe('Ada'),
        commit: async (root) => {
            typeInto(el(root, 'textarea'), 'Grace');
            return 'Grace';
        }
    }
];

async function render(host: Type<FieldHost>): Promise<Fixture> {
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    await stable(fixture);
    return fixture;
}

async function touch(fixture: Fixture, row: Case): Promise<void> {
    const target = row.focusable(fixture.nativeElement);

    if (row.touch === 'blur') {
        target.dispatchEvent(new Event('blur'));
    } else if (row.touch === 'focus') {
        target.dispatchEvent(new Event('focus'));
    } else {
        fixture.componentInstance.f.answer().markAsTouched();
    }

    await stable(fixture);
}

const showsInvalid = (fixture: Fixture, row: Case) => ({
    styled: row.styled ? row.styled(fixture.nativeElement).classList.contains('p-invalid') : null,
    aria: row.focusable(fixture.nativeElement).getAttribute('aria-invalid')
});

const NOT_SHOWN = (row: Case) => ({ styled: row.styled ? false : null, aria: null });
const SHOWN = (row: Case) => ({ styled: row.styled ? true : null, aria: 'true' });

describe('Signal Forms [formField]', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideAngulux()] });
    });

    for (const row of CASES) {
        describe(row.name, () => {
            it('shows no invalid state before the field is touched', async () => {
                const fixture = await render(row.host);

                // The field IS invalid — a required field with nothing in it — so the absence of the
                // style below is the interaction gate at work, not a field that happens to be valid.
                expect(fixture.componentInstance.f.answer().invalid()).toBeTrue();
                expect(showsInvalid(fixture, row)).toEqual(NOT_SHOWN(row));
            });

            it('shows the invalid state, and aria-invalid, once the field is touched', async () => {
                const fixture = await render(row.host);

                await touch(fixture, row);

                expect(fixture.componentInstance.f.answer().touched()).toBeTrue();
                expect(showsInvalid(fixture, row)).toEqual(SHOWN(row));
            });

            it('shows the invalid state on an untouched field after submit()', async () => {
                const fixture = await render(row.host);

                const submitted = await submit(fixture.componentInstance.f, async () => undefined);
                await stable(fixture);

                expect(submitted).toBeFalse();
                expect(showsInvalid(fixture, row)).toEqual(SHOWN(row));
            });

            it('clears the invalid state when the value becomes valid', async () => {
                const fixture = await render(row.host);
                await touch(fixture, row);

                fixture.componentInstance.model.set({ answer: row.valid });
                await stable(fixture);

                expect(fixture.componentInstance.f.answer().invalid()).toBeFalse();
                expect(showsInvalid(fixture, row)).toEqual(NOT_SHOWN(row));
            });

            it('clears the invalid state on reset(), while the field stays invalid', async () => {
                const fixture = await render(row.host);
                await touch(fixture, row);
                expect(showsInvalid(fixture, row)).toEqual(SHOWN(row));

                fixture.componentInstance.f().reset();
                await stable(fixture);

                expect(fixture.componentInstance.f.answer().invalid()).toBeTrue();
                expect(showsInvalid(fixture, row)).toEqual(NOT_SHOWN(row));
            });

            it('shows a value written to the model', async () => {
                const fixture = await render(row.host);

                fixture.componentInstance.model.set({ answer: row.valid });
                await stable(fixture);

                row.shows(fixture.nativeElement, fixture);
            });

            it('writes a value the user commits back to the model', async () => {
                const fixture = await render(row.host);

                const expected = await row.commit(fixture.nativeElement, fixture);
                await stable(fixture);

                expect(fixture.componentInstance.model().answer).toEqual(expected);
                expect(fixture.componentInstance.f.answer().dirty()).toBeTrue();
            });

            it('carries the name, required and disabled state to the element it renders', async () => {
                const fixture = await render(row.host);
                const target = row.focusable(fixture.nativeElement);
                const name = fixture.componentInstance.f.answer().name();

                if (row.renders.name) expect(target.getAttribute('name')).toBe(name);
                if (row.renders.required) expect(target.hasAttribute('required')).toBeTrue();
                if (row.renders.disabled) expect(target.hasAttribute('disabled')).toBeFalse();

                fixture.componentInstance.off.set(true);
                await stable(fixture);

                expect(fixture.componentInstance.f.answer().disabled()).toBeTrue();
                if (row.renders.disabled) expect(target.hasAttribute('disabled')).toBeTrue();
                if (row.showsDisabled) expect(row.showsDisabled(fixture.nativeElement)).toBeTrue();
            });
        });
    }

    describe('Textarea under [formField]', () => {
        it('renders without throwing, although the NgControl it injects has no valueChanges', async () => {
            const fixture = TestBed.createComponent(TextareaHost);

            expect(() => fixture.detectChanges()).not.toThrow();
            await fixture.whenStable();
        });

        it('still grows to fit a value the model writes', async () => {
            const fixture = await render(TextareaHost);
            const textarea = el(fixture.nativeElement, 'textarea');
            const before = textarea.getBoundingClientRect().height;

            fixture.componentInstance.model.set({ answer: 'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight' });
            await fixture.whenStable();

            expect(textarea.style.height).toBe(`${textarea.scrollHeight}px`);
            expect(textarea.getBoundingClientRect().height).toBeGreaterThan(before);
        });
    });

    describe('Select (editable) under [formField]', () => {
        it('renders no pattern attribute from the field', async () => {
            const fixture = TestBed.createComponent(EditableSelectHost);
            fixture.detectChanges();
            await fixture.whenStable();
            const input = el(fixture.nativeElement, 'agl-select input');

            // `[formField]` writes `readonly RegExp[]` into `pattern`. Stringified, the empty list
            // became pattern="" — a native constraint that only the empty string satisfies.
            expect(input.hasAttribute('pattern')).toBeFalse();
            expect(input.getAttribute('name')).toBe(fixture.componentInstance.f.answer().name());
            expect(input.hasAttribute('required')).toBeTrue();
        });
    });

    describe('RadioButton group under [formField]', () => {
        it('checks exactly one radio of the field as the user picks another', async () => {
            const fixture = await render(RadioButtonHost);
            const [rome, paris] = Array.from(fixture.nativeElement.querySelectorAll('agl-radiobutton input')) as HTMLInputElement[];

            rome.click();
            await fixture.whenStable();
            expect([rome.checked, paris.checked]).toEqual([true, false]);

            paris.click();
            await fixture.whenStable();
            expect([rome.checked, paris.checked]).toEqual([false, true]);
            expect(fixture.componentInstance.model().answer).toBe('Paris');
        });
    });
});

describe('Form control inputs that [formField] writes by name', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideAngulux()] });
    });

    it('min and max keep numbers, read numeric strings as numbers, and ignore everything else', () => {
        const fixture = TestBed.createComponent(InputNumber);
        const limits: [unknown, number | null | undefined][] = [
            [5, 5],
            [-2.5, -2.5],
            ['5', 5],
            [' 12 ', 12],
            [null, null],
            [undefined, undefined],
            [new Date(2024, 0, 1), undefined],
            ['2024-01-01', undefined],
            [{ min: 1 }, undefined],
            [['1'], undefined],
            ['', undefined],
            [Number.NaN, undefined],
            [Number.POSITIVE_INFINITY, undefined]
        ];

        for (const [given, read] of limits) {
            fixture.componentRef.setInput('min', given);
            fixture.componentRef.setInput('max', given);
            expect([fixture.componentInstance.min(), fixture.componentInstance.max()]).withContext(String(given)).toEqual([read, read]);
        }
    });

    it('pattern keeps a string and ignores the RegExp list a field carries', () => {
        const fixture = TestBed.createComponent(Select);

        fixture.componentRef.setInput('pattern', '[0-9]+');
        expect(fixture.componentInstance.pattern()).toBe('[0-9]+');

        fixture.componentRef.setInput('pattern', [/[0-9]+/]);
        expect(fixture.componentInstance.pattern()).toBeUndefined();

        fixture.componentRef.setInput('pattern', []);
        expect(fixture.componentInstance.pattern()).toBeUndefined();

        fixture.componentRef.setInput('pattern', null);
        expect(fixture.componentInstance.pattern()).toBeNull();
    });

    it('touched and dirty stay undefined until set, so "not reported" is not "false"', () => {
        const fixture = TestBed.createComponent(Checkbox);
        const read = () => [fixture.componentInstance.touched(), fixture.componentInstance.dirty()];

        expect(read()).toEqual([undefined, undefined]);

        fixture.componentRef.setInput('touched', false);
        fixture.componentRef.setInput('dirty', '');
        expect(read()).toEqual([false, true]);

        fixture.componentRef.setInput('touched', null);
        fixture.componentRef.setInput('dirty', undefined);
        expect(read()).toEqual([undefined, undefined]);
    });

    it('holds the invalid state back only while the form layer reports no interaction', () => {
        const fixture = TestBed.createComponent(Checkbox);
        const shown = (invalid: unknown, touched: unknown, dirty: unknown) => {
            fixture.componentRef.setInput('invalid', invalid);
            fixture.componentRef.setInput('touched', touched);
            fixture.componentRef.setInput('dirty', dirty);
            return fixture.componentInstance.$invalid();
        };

        // Neither reported: `invalid` alone decides — Reactive Forms, ngModel, a bare [invalid].
        expect(shown(true, undefined, undefined)).toBeTrue();
        expect(shown(false, undefined, undefined)).toBeFalse();
        // Reported: wait for the user.
        expect(shown(true, false, false)).toBeFalse();
        expect(shown(true, true, false)).toBeTrue();
        expect(shown(true, false, true)).toBeTrue();
        // Either one reported is enough to wait on it.
        expect(shown(true, undefined, false)).toBeFalse();
        expect(shown(true, false, undefined)).toBeFalse();
        expect(shown(false, true, true)).toBeFalse();
    });
});

describe('The invalid state under Reactive Forms', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideAngulux()] });
    });

    // [id, element carrying p-invalid (null: the control has none), element carrying aria-invalid].
    // ':scope' is the control's own host element.
    const ROWS: [string, string | null, string][] = [
        ['inputnumber', ':scope', 'input'],
        ['datepicker', ':scope', 'input'],
        ['select', ':scope', '[role="combobox"]'],
        ['multiselect', ':scope', 'input[role="combobox"]'],
        ['checkbox', ':scope', 'input'],
        ['radiobutton', ':scope', 'input'],
        ['toggleswitch', ':scope', 'input'],
        ['togglebutton', ':scope', ':scope'],
        ['selectbutton', ':scope', ':scope'],
        ['colorpicker', null, 'input'],
        ['password', 'input', 'input'],
        ['passworddirective', null, ':scope'],
        ['inputtext', ':scope', ':scope'],
        ['textarea', ':scope', ':scope']
    ];

    const find = (root: HTMLElement, id: string, selector: string) => {
        const host = el(root, `#${id}`);

        return selector === ':scope' ? host : el(host, selector);
    };

    const state = (root: HTMLElement) =>
        ROWS.map(([id, styled, focusable]) => ({
            id,
            styled: styled ? find(root, id, styled).classList.contains('p-invalid') : null,
            aria: find(root, id, focusable).getAttribute('aria-invalid')
        }));

    // Reactive Forms and ngModel never set touched or dirty, so [invalid]="true" has to keep
    // showing on the first render, before any interaction, exactly as it did before the gate.
    it('shows [invalid]="true" on the first render of every control, and clears it with [invalid]="false"', async () => {
        const fixture = TestBed.createComponent(ReactiveInvalidHost);
        fixture.detectChanges();
        await stable(fixture);
        const root = fixture.nativeElement as HTMLElement;

        expect(fixture.componentInstance.group.touched).toBeFalse();
        expect(state(root)).toEqual(ROWS.map(([id, styled]) => ({ id, styled: styled ? true : null, aria: 'true' })));

        fixture.componentInstance.invalid.set(false);
        await stable(fixture);

        expect(state(root)).toEqual(ROWS.map(([id, styled]) => ({ id, styled: styled ? false : null, aria: null })));
    });
});
