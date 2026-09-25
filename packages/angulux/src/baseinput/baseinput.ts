import { booleanAttribute, computed, Directive, inject, input } from '@angular/core';
import { BaseEditableHolder } from '@anguless/angulux/baseeditableholder';
import { Fluid } from '@anguless/angulux/fluid';

/**
 * `min` / `max` as this library reads them: a number, or no limit at all.
 *
 * Signal Forms' `[formField]` writes a field's own limits into every input of the element that
 * is NAMED `min` or `max`, typed as the field's value — a `Date` for a date field, a string for
 * a text field, whatever the model holds. Only InputNumber reads these, and only as numbers, so
 * anything that is not one means "no limit" here rather than a comparison against a Date.
 *
 * A numeric string is read as the number it spells. That is what a static `min="5"` attribute
 * delivers, and passed through unconverted it reached the form model: InputNumber clamps to
 * `min()`, so a value below the limit was replaced by the string "5".
 */
function toLimit(value: unknown): number | null | undefined {
    if (value === null || value === undefined) {
        return value;
    }

    const limit = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

    return typeof limit === 'number' && Number.isFinite(limit) ? limit : undefined;
}

/**
 * The native `pattern` attribute: a string, or none.
 *
 * `[formField]` writes the field's pattern validators here as `readonly RegExp[]`. Signal Forms
 * runs those itself and never sets a native `pattern` attribute, and a RegExp cannot round-trip
 * into one: the empty list rendered `pattern=""`, which rejects every non-empty value.
 */
function toPattern(value: string | readonly RegExp[] | null | undefined): string | null | undefined {
    return typeof value === 'string' || value === null || value === undefined ? value : undefined;
}

@Directive({ standalone: true })
export class BaseInput<PT = any> extends BaseEditableHolder<PT> {
    pcFluid: Fluid | null = inject(Fluid, { optional: true, host: true, skipSelf: true });

    /**
     * Spans 100% width of the container when enabled.
     * @defaultValue false
     * @group Props
     */
    fluid = input(undefined, { transform: booleanAttribute });
    /**
     * Specifies the input variant of the component.
     * @defaultValue 'outlined'
     * @group Props
     */
    variant = input<'filled' | 'outlined' | undefined>();
    /**
     * Specifies the size of the component.
     * @defaultValue undefined
     * @group Props
     */
    size = input<'large' | 'small' | undefined>();
    /**
     * Specifies the visible width of the input element in characters.
     * @defaultValue undefined
     * @group Props
     */
    inputSize = input<number | null | undefined>();
    /**
     * Specifies the value must match the pattern. A list of regular expressions — what Signal
     * Forms binds through `[formField]` — is ignored, because the form validates those itself.
     * @defaultValue undefined
     * @group Props
     */
    pattern = input<string | null | undefined, string | readonly RegExp[] | null | undefined>(undefined, { transform: toPattern });
    /**
     * The value must be greater than or equal to the value. A numeric string is read as a number;
     * anything else that is not a finite number, such as the `Date` limit of a date field, is ignored.
     * @defaultValue undefined
     * @group Props
     */
    min = input<number | null | undefined, unknown>(undefined, { transform: toLimit });
    /**
     * The value must be less than or equal to the value. A numeric string is read as a number;
     * anything else that is not a finite number, such as the `Date` limit of a date field, is ignored.
     * @defaultValue undefined
     * @group Props
     */
    max = input<number | null | undefined, unknown>(undefined, { transform: toLimit });
    /**
     * Unless the step is set to the any literal, the value must be min + an integral multiple of the step.
     * @defaultValue undefined
     * @group Props
     */
    step = input<number | null | undefined>();
    /**
     * The number of characters (code points) must not be less than the value of the attribute, if non-empty.
     * @defaultValue undefined
     * @group Props
     */
    minlength = input<number | null | undefined>();
    /**
     * The number of characters (code points) must not exceed the value of the attribute.
     * @defaultValue undefined
     * @group Props
     */
    maxlength = input<number | null | undefined>();

    $variant = computed(() => this.variant() || this.config.inputStyle() || this.config.inputVariant());

    get hasFluid() {
        return this.fluid() ?? !!this.pcFluid;
    }
}
