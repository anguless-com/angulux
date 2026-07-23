import { Injectable } from '@angular/core';
import { BaseStyle } from '@anguless/angulux/base';

const classes = {
    root: 'p-fluid'
};

@Injectable()
export class FluidStyle extends BaseStyle {
    name = 'fluid';

    classes = classes;
}

/**
 *
 * Fluid is a layout component to make descendant components span full width of their container.
 *
 * @module fluidstyle
 *
 */
export enum FluidClasses {
    /**
     * Class name of the root element
     */
    root = 'p-fluid'
}

export interface FluidStyle extends BaseStyle {}
