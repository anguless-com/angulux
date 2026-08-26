import { Injectable } from '@angular/core';
import { style } from '@anguless/angulux-styles/chip';
import { BaseStyle } from '@anguless/angulux/base';

const inlineStyles = {
    root: ({ instance }) => ({
        // A visible chip must leave `display` alone, and `&&` expresses that as `false` —
        // which Angular 22 rejects with NG0318 rather than ignoring. `null` is the value
        // that actually means "do not set this style".
        display: !instance.visible ? 'none' : null
    })
};

const classes = {
    root: ({ instance }) => [
        'p-chip p-component',
        {
            'p-disabled': instance.disabled
        }
    ],
    image: 'p-chip-image',
    icon: 'p-chip-icon',
    label: 'p-chip-label',
    removeIcon: 'p-chip-remove-icon'
};

@Injectable()
export class ChipStyle extends BaseStyle {
    name = 'chip';

    style = style;

    classes = classes;

    inlineStyles = inlineStyles;
}

/**
 *
 * Chip represents people using icons, labels and images.
 *
 * @module chipstyle
 *
 */
export enum ChipClasses {
    /**
     * Class name of the root element
     */
    root = 'p-chip',
    /**
     * Class name of the image element
     */
    image = 'p-chip-image',
    /**
     * Class name of the icon element
     */
    icon = 'p-chip-icon',
    /**
     * Class name of the label element
     */
    label = 'p-chip-label',
    /**
     * Class name of the remove icon element
     */
    removeIcon = 'p-chip-remove-icon'
}

export interface ChipStyle extends BaseStyle {}
