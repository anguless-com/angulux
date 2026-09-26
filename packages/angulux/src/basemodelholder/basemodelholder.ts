import { computed, Directive, effect, signal, untracked } from '@angular/core';
import { AbstractControl, NgControl, Validators } from '@angular/forms';
import { isNotEmpty } from '@anguless/angulux-utils';
import { BaseComponent } from '@anguless/angulux/basecomponent';
import type { Subscription } from 'rxjs';

type NgControlState = { invalid: boolean; touched: boolean; dirty: boolean; required: boolean };

const sameNgControlState = (a: NgControlState | null, b: NgControlState | null) =>
    a === b || (!!a && !!b && a.invalid === b.invalid && a.touched === b.touched && a.dirty === b.dirty && a.required === b.required);

const readNgControlState = (control: AbstractControl): NgControlState => ({
    invalid: control.invalid,
    touched: control.touched,
    dirty: control.dirty,
    required: control.hasValidator(Validators.required) || control.hasValidator(Validators.requiredTrue)
});

@Directive({ standalone: true })
export class BaseModelHolder<PT = any> extends BaseComponent<PT> {
    modelValue = signal<string | string[] | any | undefined>(undefined);

    $filled = computed(() => isNotEmpty(this.modelValue()));

    /**
     * What the Angular forms control bound to this element reports about itself — through
     * `formControlName`, `[formControl]` or `ngModel` — or `null` when there is none. Signal Forms'
     * `[formField]` does not count: it writes the state into the inputs instead.
     *
     * Kept current from the control's `events`, not read in a template: Angular reads `invalid`,
     * `touched` and `dirty` untracked, so a change made in code (`markAllAsTouched()`, `reset()`, a
     * validator added at run time) would otherwise reach the view only when something else
     * refreshed it, which without zone.js may be never.
     */
    $ngControlState = signal<NgControlState | null>(null, { equal: sameNgControlState });

    private _ngControl: NgControl | null | undefined;

    private _ngControlBound: AbstractControl | null = null;

    private _ngControlEvents: Subscription | undefined;

    writeModelValue(value: any) {
        this.modelValue.set(value);
    }

    /**
     * Whether a control shows its invalid state — the style and `aria-invalid` both follow it.
     *
     * With `invalid` bound, as before: `invalid`, held back until the control is touched or dirty
     * when the form layer reports either. With `invalid` left unbound, the bound forms control
     * decides by the same rule, `invalid && (touched || dirty)`, which is when an error message
     * gated the usual way appears. The two paths never mix: a bound `invalid`, even `false`, wins.
     */
    protected showsInvalid(invalid: boolean | undefined, touched: boolean | undefined, dirty: boolean | undefined): boolean {
        if (invalid === undefined) {
            const state = this.$ngControlState();

            return !!state && state.invalid && (state.touched || state.dirty);
        }

        if (!invalid) {
            return false;
        }

        return (touched === undefined && dirty === undefined) || !!touched || !!dirty;
    }

    /**
     * For a directive on a native form element (`aglInputText`, `aglTextarea`): puts
     * `aria-required="true"` on the element while the bound forms control requires a value, so a
     * screen reader announces what a label's asterisk shows. It removes only what it wrote, so an
     * `aria-required` set on the element by hand is left alone. Call it from the constructor.
     */
    protected reflectNgControlRequired() {
        let owned = false;

        effect(() => {
            const required = !!this.$ngControlState()?.required;
            const element = this.el.nativeElement as HTMLElement;

            if (required && !element.hasAttribute('aria-required')) {
                this.renderer.setAttribute(element, 'aria-required', 'true');
                owned = true;
            } else if (!required && owned) {
                this.renderer.removeAttribute(element, 'aria-required');
                owned = false;
            }
        });
    }

    override ngDoCheck() {
        this.bindNgControl();
        super.ngDoCheck();
    }

    override ngAfterContentInit() {
        this.bindNgControl();
        super.ngAfterContentInit();
    }

    override ngOnDestroy() {
        this._ngControlEvents?.unsubscribe();
        super.ngOnDestroy();
    }

    /**
     * Follows the control the element is bound to. The NgControl is looked up here, not injected:
     * a control that is its own value accessor would be asking for the directive that is asking
     * for it. By `ngAfterContentInit` every directive on the element has run its first
     * `ngOnChanges`, so `formControlName` has resolved its control; `ngDoCheck` catches a control
     * swapped later, which costs one comparison per check.
     */
    private bindNgControl() {
        if (this._ngControl === undefined) {
            this._ngControl = this.injector.get(NgControl, null, { self: true, optional: true });
        }

        const control = this._ngControl?.control;
        const bound = control instanceof AbstractControl ? control : null;

        if (bound === this._ngControlBound) {
            return;
        }

        this._ngControlEvents?.unsubscribe();
        this._ngControlEvents = undefined;
        this._ngControlBound = bound;

        if (!bound) {
            this.$ngControlState.set(null);

            return;
        }

        const read = () => untracked(() => this.$ngControlState.set(readNgControlState(bound)));

        read();
        this._ngControlEvents = bound.events.subscribe(read);
    }
}
