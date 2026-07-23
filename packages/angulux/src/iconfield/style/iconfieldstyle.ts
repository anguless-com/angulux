import { Injectable } from '@angular/core';
import { style } from '@anguless/angulux-styles/iconfield';
import { BaseStyle } from '@anguless/angulux/base';

const classes = {
    root: ({ instance }) => [
        'p-iconfield',
        {
            'p-iconfield-left': instance.iconPosition == 'left',
            'p-iconfield-right': instance.iconPosition == 'right'
        }
    ]
};

@Injectable()
export class IconFieldStyle extends BaseStyle {
    name = 'iconfield';

    style = style;

    classes = classes;
}

/**
 *
 * IconField wraps an input and an icon.
 *
 * @module iconfieldstyle
 *
 */
export enum IconFieldClasses {
    /**
     * Class name of the root element
     */
    root = 'p-iconfield'
}

export interface IconFieldStyle extends BaseStyle {}
