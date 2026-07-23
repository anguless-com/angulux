import { Injectable } from '@angular/core';
import { BaseStyle } from 'angulux/base';

const classes = {
    root: 'p-avatar-group p-component'
};

@Injectable()
export class AvatarGroupStyle extends BaseStyle {
    name = 'avatargroup';

    classes = classes;
}

/**
 *
 * A set of Avatars can be displayed together using the AvatarGroup component.
 *
 * @module avatargroupstyle
 *
 */
export enum AvatarGroupClasses {
    root = 'p-avatar-group'
}

export interface AvatarGroupStyle extends BaseStyle {}
