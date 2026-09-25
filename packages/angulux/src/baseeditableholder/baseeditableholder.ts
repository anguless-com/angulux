import { booleanAttribute, computed, Directive, input, signal } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { BaseModelHolder } from '@anguless/angulux/basemodelholder';

/**
 * `booleanAttribute`, except that "not set" — `undefined` or `null` — stays `undefined` instead
 * of becoming `false`.
 *
 * `touched` and `dirty` need that third state. It is what tells a form layer that reports
 * neither — Reactive Forms, ngModel, a bare `[invalid]` binding — apart from one that reports
 * "not yet", and only the second may hold the invalid style back.
 */
function interactionState(value: unknown): boolean | undefined {
    return value === null || value === undefined ? undefined : booleanAttribute(value);
}

@Directive({ standalone: true })
export class BaseEditableHolder<PT = any> extends BaseModelHolder<PT> implements ControlValueAccessor {
    /**
     * There must be a value (if set).
     * @defaultValue false
     * @group Props
     */
    required = input(undefined, { transform: booleanAttribute });
    /**
     * When present, it specifies that the component should have invalid state style.
     * @defaultValue false
     * @group Props
     */
    invalid = input(undefined, { transform: booleanAttribute });
    /**
     * Whether the user has visited the control. Once this or `dirty` is set, the invalid state
     * style waits for interaction: it appears when the control is touched or dirty. Signal Forms'
     * `[formField]` sets both, so an untouched required field is not shown as invalid. Leave both
     * unset and `invalid` alone decides.
     * @defaultValue undefined
     * @group Props
     */
    touched = input<boolean | undefined, unknown>(undefined, { transform: interactionState });
    /**
     * Whether the user has changed the value. See `touched`.
     * @defaultValue undefined
     * @group Props
     */
    dirty = input<boolean | undefined, unknown>(undefined, { transform: interactionState });
    /**
     * When present, it specifies that the component should have disabled state style.
     * @defaultValue false
     * @group Props
     */
    disabled = input(undefined, { transform: booleanAttribute });
    /**
     * When present, it specifies that the name of the input.
     * @defaultValue undefined
     * @group Props
     */
    name = input<string | undefined>();

    _disabled = signal<boolean>(false);

    $disabled = computed(() => this.disabled() || this._disabled());

    /**
     * Whether the invalid state is shown: `invalid`, held back until the control is touched or
     * dirty when the form layer reports either. The style and `aria-invalid` both read this.
     */
    $invalid = computed(() => {
        if (!this.invalid()) {
            return false;
        }

        const touched = this.touched();
        const dirty = this.dirty();

        return (touched === undefined && dirty === undefined) || !!touched || !!dirty;
    });

    onModelChange: Function = () => {};

    onModelTouched: Function = () => {};

    writeDisabledState(value: boolean) {
        this._disabled.set(value);
    }

    writeControlValue(value: any, setModelValue?: (value: any) => void) {
        // NOOP - this method should be overridden in the derived classes
    }

    /**** Angular ControlValueAccessors ****/
    writeValue(value: any) {
        this.writeControlValue(value, this.writeModelValue.bind(this));
    }

    registerOnChange(fn: Function) {
        this.onModelChange = fn;
    }

    registerOnTouched(fn: Function) {
        this.onModelTouched = fn;
    }

    setDisabledState(val: boolean) {
        this.writeDisabledState(val);
        this.cd.markForCheck();
    }
}
