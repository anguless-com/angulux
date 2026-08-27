import { Injectable } from '@angular/core';
import { style as badge_style } from '@anguless/angulux-styles/badge';
import { isEmpty, isNotEmpty } from '@anguless/angulux-utils';
import { BaseStyle } from '@anguless/angulux/base';

// NO BACKTICKS ANYWHERE BELOW, comments included: this is a template literal, so a backtick
// closes it. Sometimes that is a compile error and sometimes it is not — `a` > `b` parses as a
// comparison, and the whole constant silently becomes the boolean false. The stylesheet then
// loads as the five characters "false" and every badge rule disappears with no error anywhere.
const style = /*css*/ `
    ${badge_style}

    /* For AnguluxConfig (directive)*/
    .p-overlay-badge {
        position: relative;
    }

    /* The overlay badge is centred on the host's top-inline-end corner, so three of its four
       quadrants sit outside the host box. A host that clips its overflow therefore cuts the
       badge down to a sliver — and .p-button clips: it sets overflow: hidden so the ripple
       ink stays inside the button. That is why aglBadge on an agl-button put a badge in the
       DOM that nobody could see, while the same directive on an <i> worked.

       The class is doubled to out-specify .p-button's single class. Both rules are injected
       as separate <style> elements whose order depends on which component initialises first,
       so specificity has to decide this, not source order.

       Trade-off, stated rather than hidden: on a host that also carries aglRipple, with
       ripple enabled in the config, the ink is no longer clipped by that host either. It is
       bounded to hosts a badge is actually attached to, and ripple is off by default. */
    .p-overlay-badge.p-overlay-badge {
        overflow: visible;
    }

    /* And the same for whatever directly wraps a badged element, because the host rule above
       does not always land on the element that clips. A component that styles its OWN host
       does not: ToggleButton puts .p-togglebutton on <agl-togglebutton> and renders a <span>
       inside, and the directive attaches to firstChild, so the badge ends up on that inner
       span while the clip stays one level up. Button is the other shape — an inner <button>
       carrying .p-button — which is why the two behave differently for the same markup.

       Scoped to the direct-child combinator deliberately. Any wider and a container would lose
       its clip for merely
       having a badge somewhere beneath it — a scroll area around a badged button, say — which
       is a much bigger promise than this needs to make. :has() takes the specificity of its
       argument, so this lands at 0,2,0 like the rule above and for the same reason.

       A clipping ancestor further up is NOT covered and cannot be from here: it is the app's
       own layout, and unclipping it would be the library overruling a decision that is not
       its own. */
    *:has(> .p-overlay-badge.p-overlay-badge) {
        overflow: visible;
    }

    .p-overlay-badge > .p-badge {
        position: absolute;
        top: 0;
        inset-inline-end: 0;
        transform: translate(50%, -50%);
        transform-origin: 100% 0;
        margin: 0;
    }
`;

const classes = {
    root: ({ instance }) => {
        const value = typeof instance.value === 'function' ? instance.value() : instance.value;
        const size = typeof instance.size === 'function' ? instance.size() : instance.size;
        const badgeSize = typeof instance.badgeSize === 'function' ? instance.badgeSize() : instance.badgeSize;
        const severity = typeof instance.severity === 'function' ? instance.severity() : instance.severity;

        return [
            'p-badge p-component',
            {
                'p-badge-circle': isNotEmpty(value) && String(value).length === 1,
                'p-badge-dot': isEmpty(value),
                'p-badge-sm': size === 'small' || badgeSize === 'small',
                'p-badge-lg': size === 'large' || badgeSize === 'large',
                'p-badge-xl': size === 'xlarge' || badgeSize === 'xlarge',
                'p-badge-info': severity === 'info',
                'p-badge-success': severity === 'success',
                'p-badge-warn': severity === 'warn',
                'p-badge-danger': severity === 'danger',
                'p-badge-secondary': severity === 'secondary',
                'p-badge-contrast': severity === 'contrast'
            }
        ];
    }
};

@Injectable()
export class BadgeStyle extends BaseStyle {
    name = 'badge';

    style = style;

    classes = classes;
}

/**
 *
 * Badge represents people using icons, labels and images.
 *
 * @module badgestyle
 *
 */
export enum BadgeClasses {
    /**
     * Class name of the root element
     */
    root = 'p-badge'
}

export interface BadgeStyle extends BaseStyle {}
