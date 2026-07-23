import { Injectable } from '@angular/core';
import { style as textarea_style } from '@anguless/angulux-styles/textarea';
import { BaseStyle } from '@anguless/angulux/base';

const style = /*css*/ `
    ${textarea_style}

    /* For AnguluxConfig */
    .p-textarea.ng-invalid.ng-dirty {
        border-color: dt('textarea.invalid.border.color');
    }
    .p-textarea.ng-invalid.ng-dirty::placeholder {
        color: dt('textarea.invalid.placeholder.color');
    }
`;

const classes = {
    root: ({ instance }) => [
        'p-textarea p-component',
        {
            'p-filled': instance.$filled(),
            'p-textarea-resizable ': instance.autoResize,
            'p-variant-filled': instance.$variant() === 'filled',
            'p-textarea-fluid': instance.hasFluid,
            'p-inputfield-sm p-textarea-sm': instance.aglSize === 'small',
            'p-textarea-lg p-inputfield-lg': instance.aglSize === 'large',
            'p-invalid': instance.invalid()
        }
    ]
};

@Injectable()
export class TextareaStyle extends BaseStyle {
    name = 'textarea';

    style = style;

    classes = classes;
}

/**
 *
 * Textarea is a multi-line text input element.
 *
 * @module textareastyle
 *
 */
export enum TextareaClasses {
    /**
     * Class name of the root element
     */
    root = 'p-textarea'
}

export interface TextareaStyle extends BaseStyle {}
