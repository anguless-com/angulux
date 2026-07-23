import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseIcon } from 'angulux/icons/baseicon';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: '[data-p-icon="blank"]',
    standalone: true,
    template: ` <svg:rect width="1" height="1" fill="currentColor" fill-opacity="0" /> `
})
export class BlankIcon extends BaseIcon {}
