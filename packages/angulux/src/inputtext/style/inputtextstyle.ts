import { Injectable } from '@angular/core';
import { style as inputtext_style } from 'angulux-styles/inputtext';
import { BaseStyle } from 'angulux/base';

const style = /*css*/ `
    ${inputtext_style}

    /* For AnguluxConfig */
   .p-inputtext.ng-invalid.ng-dirty {
        border-color: dt('inputtext.invalid.border.color');
    }

    .p-inputtext.ng-invalid.ng-dirty::placeholder {
        color: dt('inputtext.invalid.placeholder.color');
    }
`;

const classes = {
    root: ({ instance }) => [
        'p-inputtext p-component',
        {
            'p-filled': instance.$filled(),
            'p-inputtext-sm': instance.aglSize === 'small',
            'p-inputtext-lg': instance.aglSize === 'large',
            'p-invalid': instance.invalid(),
            'p-variant-filled': instance.$variant() === 'filled',
            'p-inputtext-fluid': instance.hasFluid
        }
    ]
};

@Injectable()
export class InputTextStyle extends BaseStyle {
    name = 'inputtext';

    style = style;

    classes = classes;
}

/**
 *
 * InputText renders a text field to enter data.
 *
 * @module inputtextstyle
 *
 */
export enum InputTextClasses {
    /**
     * The class of root element
     */
    root = 'p-inputtext'
}

export interface InputTextStyle extends BaseStyle {}
