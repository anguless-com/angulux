/**
 * Signal Forms' `[formField]` on every form control the package ships.
 *
 * Nothing imports this file. It exists to be type-checked by `tools/check-signal-forms.mjs`,
 * against the BUILT package and with `strictTemplates` on, and it must produce no diagnostic.
 *
 * WHAT IT PROVES. With `[formField]` on an element, the Angular compiler binds the field's state
 * onto every input of that element whose NAME matches a field property — `min`, `max`,
 * `pattern`, `required`, `disabled`, `readonly`, `invalid`, `touched`, `dirty`, `name`, … —
 * typed as the field declares them: `min` as the field's own value type, `pattern` as
 * `readonly RegExp[]`. An input declared narrower than that is a compile error in every
 * consumer's template, and nothing in this repository used to compile one.
 *
 * The fields cover the value types these controls are bound to in practice: number, Date,
 * Date[], string, string | null, an object, string[], boolean. The check also reads the corpus
 * and fails when a form control exists that no `[formField]` below binds.
 */
import { Component, signal } from '@angular/core';
import { disabled, form, FormField, max, maxLength, min, minLength, pattern, readonly, required } from '@angular/forms/signals';
import { Checkbox } from '@anguless/angulux/checkbox';
import { ColorPicker } from '@anguless/angulux/colorpicker';
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

interface Place {
    code: string;
    label: string;
}

interface Rgb {
    r: number;
    g: number;
    b: number;
}

@Component({
    selector: 'fixture-form-field',
    imports: [FormField, Checkbox, ColorPicker, DatePicker, InputNumber, InputText, MultiSelect, Password, PasswordDirective, RadioButton, Select, SelectButton, Textarea, ToggleButton, ToggleSwitch],
    template: `
        <agl-inputnumber [formField]="f.amount" />
        <agl-inputnumber [formField]="f.count" [showButtons]="true" />

        <agl-datepicker [formField]="f.when" />
        <agl-datepicker [formField]="f.span" selectionMode="range" />
        <agl-datepicker [formField]="f.days" selectionMode="multiple" />
        <agl-datepicker [formField]="f.iso" dataType="string" />

        <agl-select [formField]="f.city" [options]="cities" />
        <agl-select [formField]="f.place" [options]="places" optionLabel="label" />
        <agl-select [formField]="f.code" [options]="places" optionLabel="label" optionValue="code" [editable]="true" />

        <agl-multiselect [formField]="f.cities" [options]="cities" />
        <agl-multiselect [formField]="f.places" [options]="places" optionLabel="label" />

        <agl-selectbutton [formField]="f.city" [options]="cities" />
        <agl-selectbutton [formField]="f.cities" [options]="cities" [multiple]="true" />

        <agl-checkbox [formField]="f.agree" [binary]="true" />
        <agl-checkbox [formField]="f.cities" value="Rome" />
        <agl-radiobutton [formField]="f.city" value="Rome" />
        <agl-radiobutton [formField]="f.city" value="Paris" />
        <agl-toggleswitch [formField]="f.agree" />
        <agl-togglebutton [formField]="f.agree" onLabel="On" offLabel="Off" />

        <agl-colorpicker [formField]="f.color" />
        <agl-colorpicker [formField]="f.rgb" format="rgb" />

        <agl-password [formField]="f.secret" />
        <input type="password" aglPassword [formField]="f.secret" />
        <input aglInputText [formField]="f.name" />
        <textarea aglTextarea [formField]="f.note"></textarea>
        <textarea aglInputTextarea [formField]="f.note"></textarea>
    `
})
export class FormFieldFixture {
    cities = ['Rome', 'Paris'];

    places: Place[] = [
        { code: 'RM', label: 'Rome' },
        { code: 'PR', label: 'Paris' }
    ];

    model = signal({
        amount: null as number | null,
        count: 0,
        when: null as Date | null,
        span: [] as Date[],
        days: [] as Date[],
        iso: '',
        city: null as string | null,
        place: null as Place | null,
        code: '',
        cities: [] as string[],
        places: [] as Place[],
        agree: false,
        color: '#ff0000',
        rgb: { r: 255, g: 0, b: 0 } as Rgb,
        secret: '',
        name: '',
        note: ''
    });

    locked = signal(false);

    f = form(this.model, (p) => {
        required(p.amount);
        min(p.amount, 1);
        max(p.amount, 100);
        min(p.count, 0);
        required(p.when);
        required(p.city);
        required(p.place);
        minLength(p.cities, 1);
        required(p.agree);
        required(p.secret);
        minLength(p.secret, 8);
        maxLength(p.secret, 64);
        pattern(p.secret, /[0-9]/);
        required(p.name);
        pattern(p.name, /^[A-Z]/);
        pattern(p.code, /^[A-Z]{2}$/);
        maxLength(p.note, 500);
        readonly(p.note, () => this.locked());
        disabled(p.color, () => this.locked());
    });
}
