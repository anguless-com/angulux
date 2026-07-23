import { Injectable } from '@angular/core';
import { BaseStyle } from '@anguless/angulux/base';

@Injectable({ providedIn: 'root' })
export class BaseComponentStyle extends BaseStyle {
    name = 'common';
}
