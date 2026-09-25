import { booleanAttribute, computed, Directive, effect, HostListener, inject, InjectionToken, input, Input, NgModule } from '@angular/core';
import { NgControl } from '@angular/forms';
import { PARENT_INSTANCE } from '@anguless/angulux/basecomponent';
import { BaseModelHolder } from '@anguless/angulux/basemodelholder';
import { Bind } from '@anguless/angulux/bind';
import { Fluid } from '@anguless/angulux/fluid';
import { InputTextPassThrough } from '@anguless/angulux/types/inputtext';
import { InputTextStyle } from './style/inputtextstyle';

const INPUTTEXT_INSTANCE = new InjectionToken<InputText>('INPUTTEXT_INSTANCE');

/** `booleanAttribute` that keeps "not set" as `undefined` — see `BaseEditableHolder` for why. */
function interactionState(value: unknown): boolean | undefined {
    return value === null || value === undefined ? undefined : booleanAttribute(value);
}

/**
 * InputText directive is an extension to standard input element with theming.
 * @group Components
 */
@Directive({
    selector: '[aglInputText]',
    standalone: true,
    host: {
        '[class]': "cx('root')",
        '[attr.data-p]': 'dataP',
        '[attr.aria-invalid]': '$invalid() || undefined'
    },
    providers: [InputTextStyle, { provide: INPUTTEXT_INSTANCE, useExisting: InputText }, { provide: PARENT_INSTANCE, useExisting: InputText }],
    hostDirectives: [Bind]
})
export class InputText extends BaseModelHolder<InputTextPassThrough> {
    componentName = 'InputText';

    @Input() hostName: any = '';

    /**
     * Used to pass attributes to DOM elements inside the InputText component.
     * @defaultValue undefined
     * @deprecated use pInputTextPT instead.
     * @group Props
     */
    ptInputText = input<InputTextPassThrough>();
    /**
     * Used to pass attributes to DOM elements inside the InputText component.
     * @defaultValue undefined
     * @group Props
     */
    pInputTextPT = input<InputTextPassThrough>();
    /**
     * Indicates whether the component should be rendered without styles.
     * @defaultValue undefined
     * @group Props
     */
    pInputTextUnstyled = input<boolean | undefined>();

    bindDirectiveInstance = inject(Bind, { self: true });

    $pcInputText: InputText | undefined = inject(INPUTTEXT_INSTANCE, { optional: true, skipSelf: true }) ?? undefined;

    ngControl = inject(NgControl, { optional: true, self: true });

    pcFluid: Fluid | null = inject(Fluid, { optional: true, host: true, skipSelf: true });

    /**
     * Defines the size of the component.
     * @group Props
     */
    @Input('aglSize') aglSize: 'large' | 'small' | undefined;
    /**
     * Specifies the input variant of the component.
     * @defaultValue undefined
     * @group Props
     */
    variant = input<'filled' | 'outlined' | undefined>();
    /**
     * Spans 100% width of the container when enabled.
     * @defaultValue undefined
     * @group Props
     */
    fluid = input(undefined, { transform: booleanAttribute });
    /**
     * When present, it specifies that the component should have invalid state style.
     * @defaultValue false
     * @group Props
     */
    invalid = input(undefined, { transform: booleanAttribute });
    /**
     * Whether the user has visited the field. Once this or `dirty` is set, the invalid state
     * style waits for interaction: it appears when the field is touched or dirty. Signal Forms'
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

    $variant = computed(() => this.variant() || this.config.inputStyle() || this.config.inputVariant());

    /** Whether the invalid state is shown — the same rule as `BaseEditableHolder.$invalid`. */
    $invalid = computed(() => {
        if (!this.invalid()) {
            return false;
        }

        const touched = this.touched();
        const dirty = this.dirty();

        return (touched === undefined && dirty === undefined) || !!touched || !!dirty;
    });

    _componentStyle = inject(InputTextStyle);

    constructor() {
        super();
        effect(() => {
            const pt = this.ptInputText() || this.pInputTextPT();
            pt && this.directivePT.set(pt);
        });

        effect(() => {
            this.pInputTextUnstyled() && this.directiveUnstyled.set(this.pInputTextUnstyled());
        });
    }

    onAfterViewInit() {
        this.writeModelValue(this.ngControl?.value ?? this.el.nativeElement.value);
        this.cd.detectChanges();
    }

    onAfterViewChecked(): void {
        this.bindDirectiveInstance.setAttrs(this.ptm('root'));
    }

    onDoCheck() {
        this.writeModelValue(this.ngControl?.value ?? this.el.nativeElement.value);
    }

    @HostListener('input')
    onInput() {
        this.writeModelValue(this.ngControl?.value ?? this.el.nativeElement.value);
    }

    get hasFluid() {
        return this.fluid() ?? !!this.pcFluid;
    }

    get dataP() {
        return this.cn({
            invalid: this.$invalid(),
            fluid: this.hasFluid,
            filled: this.$variant() === 'filled',
            [this.aglSize as string]: this.aglSize
        });
    }
}

@NgModule({
    imports: [InputText],
    exports: [InputText]
})
export class InputTextModule {}
