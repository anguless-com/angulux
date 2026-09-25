/**
 * The bindings Reactive Forms, ngModel and plain attribute users already write, which have to
 * keep compiling after the inputs `[formField]` writes by name were widened.
 *
 * Nothing imports this file; `tools/check-signal-forms.mjs` type-checks it with `strictTemplates`
 * on, against the built package, and it must produce no diagnostic. `min="5"` is the one line
 * here that did NOT compile under strictTemplates before — a static attribute is a string — and
 * compiles now because a numeric string is read as the number it spells.
 */
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Checkbox } from '@anguless/angulux/checkbox';
import { DatePicker } from '@anguless/angulux/datepicker';
import { InputNumber } from '@anguless/angulux/inputnumber';
import { InputText } from '@anguless/angulux/inputtext';
import { Password } from '@anguless/angulux/password';
import { Select } from '@anguless/angulux/select';
import { Textarea } from '@anguless/angulux/textarea';

@Component({
    selector: 'fixture-attributes',
    imports: [FormsModule, ReactiveFormsModule, Checkbox, DatePicker, InputNumber, InputText, Password, Select, Textarea],
    template: `
        <agl-inputnumber [formControl]="amount" [min]="5" [max]="10" [invalid]="true" />
        <agl-inputnumber [(ngModel)]="count" min="5" max="10" [invalid]="amount.invalid && amount.dirty" />
        <agl-inputnumber [(ngModel)]="count" [min]="null" [max]="limit" />

        <agl-select [formControl]="city" [options]="cities" [editable]="true" pattern="[0-9]+" [invalid]="invalid" />
        <agl-select [formControl]="city" [options]="cities" [editable]="true" [pattern]="digits" [min]="undefined" />

        <agl-datepicker [formControl]="when" [invalid]="invalid" [touched]="when.touched" [dirty]="when.dirty" />
        <agl-password [formControl]="secret" [invalid]="invalid" />
        <agl-checkbox [formControl]="agree" [binary]="true" [invalid]="true" />

        <input aglInputText [formControl]="name" [invalid]="invalid" [touched]="name.touched" [dirty]="name.dirty" />
        <textarea aglTextarea [formControl]="note" [invalid]="invalid" touched dirty></textarea>
    `
})
export class AttributesFixture {
    cities = ['Rome', 'Paris'];

    digits = '[0-9]+';

    limit: number | undefined = 10;

    invalid = true;

    count = 0;

    amount = new FormControl<number | null>(null);

    city = new FormControl<string | null>(null);

    when = new FormControl<Date | null>(null);

    secret = new FormControl('');

    agree = new FormControl(false);

    name = new FormControl('');

    note = new FormControl('');
}
