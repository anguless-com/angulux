/**
 * The negative control. This file MUST fail to compile, with exactly the errors the check expects.
 *
 * `tools/check-signal-forms.mjs` compiles it in the same program as the two fixtures that must
 * compile cleanly. A clean result from them means something only if this file is rejected there,
 * for the reason it was written to be:
 *
 *   1. `narrowFieldInputs` declares `min` and `pattern` the way BaseInput did before `[formField]`
 *      support — `number | null | undefined` and `string | null | undefined`. On a string field
 *      the compiler binds `string | undefined` into the first and `readonly RegExp[]` into the
 *      second: two TS2322. If `[formField]` stopped being expanded into named inputs, or
 *      strictTemplates were off, both would vanish and the check would say so.
 *   2. `variant` on the shipped InputNumber takes `'filled' | 'outlined'`: one TS2322. If the
 *      package's declarations were not the ones in this program, the error would be a different
 *      one — or none.
 *
 * The check finds the two template lines by their text, so keep each on its own line.
 */
import { Component, Directive, input, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { InputNumber } from '@anguless/angulux/inputnumber';
import { InputText } from '@anguless/angulux/inputtext';

@Directive({ selector: '[narrowFieldInputs]' })
export class NarrowFieldInputs {
    readonly min = input<number | null | undefined>();

    readonly pattern = input<string | null | undefined>();
}

@Component({
    selector: 'fixture-poison',
    imports: [FormField, InputNumber, InputText, NarrowFieldInputs],
    template: `
        <input aglInputText narrowFieldInputs [formField]="f.name" />
        <agl-inputnumber [formField]="f.amount" [variant]="'bogus'" />
    `
})
export class PoisonFixture {
    model = signal({ name: '', amount: null as number | null });

    f = form(this.model);
}
