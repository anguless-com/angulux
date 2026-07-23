import { Injectable } from '@angular/core';
import { BaseStyle } from 'angulux/base';

@Injectable({ providedIn: 'root' })
export class BaseComponentStyle extends BaseStyle {
    name = 'common';
}
