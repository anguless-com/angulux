import { Injectable } from '@angular/core';
import { BaseStyle } from '@anguless/angulux/base';

const classes = {
    root: 'p-tabpanels'
};

@Injectable()
export class TabPanelsStyle extends BaseStyle {
    name = 'tabpanels';

    classes = classes;
}

/**
 *
 * Tab is a helper component for Tabs component.
 *
 * @module tabpanelstyle
 *
 */

export enum TabPanelsClasses {
    /**
     * Class name of the root element
     */
    root = 'p-tabpanels'
}

export interface TabPanelsStyle extends BaseStyle {}
