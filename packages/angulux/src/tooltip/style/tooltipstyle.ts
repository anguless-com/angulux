import { Injectable } from '@angular/core';
import { style } from 'angulux-styles/tooltip';
import { BaseStyle } from 'angulux/base';

const classes = {
    root: 'p-tooltip p-component',
    arrow: 'p-tooltip-arrow',
    text: 'p-tooltip-text'
};

@Injectable()
export class TooltipStyle extends BaseStyle {
    name = 'tooltip';

    style = style;

    classes = classes;
}

/**
 *
 * Tooltip directive provides advisory information for a component.
 *
 * @module tooltipstyle
 *
 */
export enum TooltipClasses {
    /**
     * Class name of the root element
     */
    root = 'p-tooltip',
    /**
     * Class name of the arrow element
     */
    arrow = 'p-tooltip-arrow',
    /**
     * Class name of the text element
     */
    text = 'p-tooltip-text'
}

export interface TooltipStyle extends BaseStyle {}
