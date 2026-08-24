import { Type } from '@angular/core';

/**
 * What each module's page shows, and in what order.
 *
 * The prose lives HERE rather than inside the demo components, and that is deliberate. A demo
 * file that also carried its own heading and explanation could not be shown to the reader
 * verbatim — they would have to mentally strip the parts that only exist because this is a
 * documentation site. Keeping the files pure is what lets `build-demos.mjs` publish them
 * as-is, which in turn is what makes "the code shown is the code that ran" true by
 * construction rather than by discipline.
 *
 * `id` must match the id `build-demos.mjs` derives from the file path — `<module>-<file>`,
 * with the `-doc.ts` suffix removed. `check:demo-code` compares the two and fails on a
 * mismatch, so an entry cannot name one demo and render another.
 */
export interface DemoSection {
    id: string;
    label: string;
    description: string;
    load: () => Promise<Type<unknown>>;
}

export const DEMO_SECTIONS: Record<string, DemoSection[]> = {
    button: [
        {
            id: 'button-basic',
            label: 'Basic',
            description: 'Text to display on a button is defined with the label property.',
            load: () => import('./button/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'button-directive',
            label: 'Directive',
            description: 'Button can also be used as a directive with aglButton, together with the aglButtonLabel and aglButtonIcon helpers.',
            load: () => import('./button/directive-doc').then((m) => m.DirectiveDoc)
        },
        {
            id: 'button-severity',
            label: 'Severity',
            description: 'Severity defines the type of button.',
            load: () => import('./button/severity-doc').then((m) => m.SeverityDoc)
        },
        {
            id: 'button-icons',
            label: 'Icons',
            description: 'The icon of a button is specified with the icon property, and its position is configured with iconPos.',
            load: () => import('./button/icons-doc').then((m) => m.IconsDoc)
        },
        {
            id: 'button-sizes',
            label: 'Sizes',
            description: 'Button provides small and large sizes as alternatives to the standard.',
            load: () => import('./button/sizes-doc').then((m) => m.SizesDoc)
        },
        {
            id: 'button-loading',
            label: 'Loading',
            description: 'Busy state is controlled with the loading property.',
            load: () => import('./button/loading-doc').then((m) => m.LoadingDoc)
        },
        {
            id: 'button-disabled',
            label: 'Disabled',
            description: 'When disabled is present, the element cannot be edited or focused.',
            load: () => import('./button/disabled-doc').then((m) => m.DisabledDoc)
        }
    ],
    inputtext: [
        {
            id: 'inputtext-basic',
            label: 'Basic',
            description: 'InputText is a directive, applied to a native input element so every attribute you already know keeps working.',
            load: () => import('./inputtext/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'inputtext-sizes',
            label: 'Sizes',
            description: 'Size is set with aglSize, which accepts small and large.',
            load: () => import('./inputtext/sizes-doc').then((m) => m.SizesDoc)
        },
        {
            id: 'inputtext-invalid',
            label: 'Invalid',
            description: 'The invalid property styles the field as failing validation, independently of any forms API.',
            load: () => import('./inputtext/invalid-doc').then((m) => m.InvalidDoc)
        },
        {
            id: 'inputtext-disabled',
            label: 'Disabled',
            description: 'Disabling uses the native attribute, because the directive does not replace the element.',
            load: () => import('./inputtext/disabled-doc').then((m) => m.DisabledDoc)
        }
    ],
    checkbox: [
        {
            id: 'checkbox-basic',
            label: 'Basic',
            description: 'A checkbox bound to a boolean needs binary, otherwise it works on a value collected into an array.',
            load: () => import('./checkbox/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'checkbox-group',
            label: 'Group',
            description: 'Several checkboxes bound to the same array collect their values into it.',
            load: () => import('./checkbox/group-doc').then((m) => m.GroupDoc)
        },
        {
            id: 'checkbox-indeterminate',
            label: 'Indeterminate',
            description: 'The indeterminate state is a third visual state, distinct from checked and unchecked.',
            load: () => import('./checkbox/indeterminate-doc').then((m) => m.IndeterminateDoc)
        },
        {
            id: 'checkbox-sizes',
            label: 'Sizes',
            description: 'Checkbox provides small and large sizes as alternatives to the standard.',
            load: () => import('./checkbox/sizes-doc').then((m) => m.SizesDoc)
        }
    ],
    radiobutton: [
        {
            id: 'radiobutton-basic',
            label: 'Basic',
            description: 'Radio buttons sharing a name and bound to the same value form one group.',
            load: () => import('./radiobutton/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'radiobutton-sizes',
            label: 'Sizes',
            description: 'RadioButton provides small and large sizes as alternatives to the standard.',
            load: () => import('./radiobutton/sizes-doc').then((m) => m.SizesDoc)
        }
    ],
    select: [
        {
            id: 'select-basic',
            label: 'Basic',
            description: 'Select takes an options array; optionLabel names the property to display.',
            load: () => import('./select/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'select-filter',
            label: 'Filter',
            description: 'Filtering is enabled with filter, and filterBy chooses which properties are searched.',
            load: () => import('./select/filter-doc').then((m) => m.FilterDoc)
        },
        {
            id: 'select-clear',
            label: 'Clear',
            description: 'showClear adds a control that returns the value to null.',
            load: () => import('./select/clear-doc').then((m) => m.ClearDoc)
        },
        {
            id: 'select-editable',
            label: 'Editable',
            description: 'An editable select accepts values that are not in the list.',
            load: () => import('./select/editable-doc').then((m) => m.EditableDoc)
        }
    ],
    datepicker: [
        {
            id: 'datepicker-basic',
            label: 'Basic',
            description: 'Two-way binding to a Date is all a plain date field needs.',
            load: () => import('./datepicker/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'datepicker-icon',
            label: 'Icon and button bar',
            description: 'showIcon adds a trigger button; showButtonBar adds Today and Clear.',
            load: () => import('./datepicker/icon-doc').then((m) => m.IconDoc)
        },
        {
            id: 'datepicker-inline',
            label: 'Inline',
            description: 'An inline picker is always visible instead of opening in an overlay.',
            load: () => import('./datepicker/inline-doc').then((m) => m.InlineDoc)
        },
        {
            id: 'datepicker-range',
            label: 'Range',
            description: 'In range mode the bound value is an array of two dates.',
            load: () => import('./datepicker/range-doc').then((m) => m.RangeDoc)
        },
        {
            id: 'datepicker-time',
            label: 'Time',
            description: 'showTime adds a time section; hourFormat switches between 12 and 24 hours.',
            load: () => import('./datepicker/time-doc').then((m) => m.TimeDoc)
        }
    ],
    dialog: [
        {
            id: 'dialog-basic',
            label: 'Basic',
            description: 'Visibility is controlled by the visible property and its visibleChange output.',
            load: () => import('./dialog/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'dialog-modal',
            label: 'Modal',
            description: 'A modal dialog blocks the page behind it and traps focus until it closes.',
            load: () => import('./dialog/modal-doc').then((m) => m.ModalDoc)
        },
        {
            id: 'dialog-maximizable',
            label: 'Maximizable',
            description: 'Maximizable adds a header control that expands the dialog to the full viewport.',
            load: () => import('./dialog/maximizable-doc').then((m) => m.MaximizableDoc)
        }
    ],
    toast: [
        {
            id: 'toast-basic',
            label: 'Basic',
            description: 'Toast renders whatever MessageService is told to add. The service is provided by the component that owns the toast.',
            load: () => import('./toast/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'toast-severity',
            label: 'Severity',
            description: 'Severity decides the colour and icon of the message.',
            load: () => import('./toast/severity-doc').then((m) => m.SeverityDoc)
        },
        {
            id: 'toast-position',
            label: 'Position',
            description: 'Several toasts can coexist when each has its own key, and messages are routed by that key.',
            load: () => import('./toast/position-doc').then((m) => m.PositionDoc)
        }
    ],
    card: [
        {
            id: 'card-basic',
            label: 'Basic',
            description: 'A card takes a header string and projects its children as content.',
            load: () => import('./card/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'card-advanced',
            label: 'With a footer',
            description: 'Header, title, subtitle, content and footer are template slots for anything that needs markup rather than a string.',
            load: () => import('./card/advanced-doc').then((m) => m.AdvancedDoc)
        }
    ],
    tabs: [
        {
            id: 'tabs-basic',
            label: 'Basic',
            description: 'Tabs is composed of Tabs, TabList, TabPanels and TabPanel. A tab and its panel are paired by value.',
            load: () => import('./tabs/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'tabs-scrollable',
            label: 'Scrollable',
            description: 'When the headers do not fit, scrollable adds navigators instead of wrapping.',
            load: () => import('./tabs/scrollable-doc').then((m) => m.ScrollableDoc)
        }
    ],
    tag: [
        {
            id: 'tag-basic',
            label: 'Basic',
            description: 'The label of a tag is defined with the value property.',
            load: () => import('./tag/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'tag-severity',
            label: 'Severity',
            description: 'Severity defines the colour of the tag.',
            load: () => import('./tag/severity-doc').then((m) => m.SeverityDoc)
        },
        {
            id: 'tag-rounded',
            label: 'Rounded',
            description: 'Rounded tags have fully round corners.',
            load: () => import('./tag/rounded-doc').then((m) => m.RoundedDoc)
        },
        {
            id: 'tag-icons',
            label: 'Icons',
            description: 'An icon is displayed next to the value with the icon property.',
            load: () => import('./tag/icons-doc').then((m) => m.IconsDoc)
        }
    ],
    avatar: [
        {
            id: 'avatar-basic',
            label: 'Basic',
            description: 'An avatar shows a label or an icon; image is a third option.',
            load: () => import('./avatar/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'avatar-sizes',
            label: 'Sizes',
            description: 'Size accepts large and xlarge as alternatives to the standard.',
            load: () => import('./avatar/sizes-doc').then((m) => m.SizesDoc)
        },
        {
            id: 'avatar-shape',
            label: 'Shape',
            description: 'Shape switches between a square and a circle.',
            load: () => import('./avatar/shape-doc').then((m) => m.ShapeDoc)
        }
    ],
    avatargroup: [
        {
            id: 'avatargroup-basic',
            label: 'Basic',
            description: 'Wrapping avatars in a group overlaps them and shares one outline.',
            load: () => import('./avatargroup/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    badge: [
        {
            id: 'badge-basic',
            label: 'Basic',
            description: 'The content of a badge is set with the value property.',
            load: () => import('./badge/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'badge-severity',
            label: 'Severity',
            description: 'Severity defines the colour of the badge.',
            load: () => import('./badge/severity-doc').then((m) => m.SeverityDoc)
        },
        {
            id: 'badge-directive',
            label: 'Directive',
            description: 'aglBadge attaches a badge to any element, which is how it is put on a button or an icon.',
            load: () => import('./badge/directive-doc').then((m) => m.DirectiveDoc)
        }
    ],
    chip: [
        {
            id: 'chip-basic',
            label: 'Basic',
            description: 'A chip displays its label.',
            load: () => import('./chip/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'chip-icon',
            label: 'Icon',
            description: 'An icon is shown before the label with the icon property.',
            load: () => import('./chip/icon-doc').then((m) => m.IconDoc)
        },
        {
            id: 'chip-removable',
            label: 'Removable',
            description: 'A removable chip gains a control that takes it out of the DOM.',
            load: () => import('./chip/removable-doc').then((m) => m.RemovableDoc)
        }
    ],
    divider: [
        {
            id: 'divider-basic',
            label: 'Basic',
            description: 'A divider goes between the items it separates.',
            load: () => import('./divider/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'divider-type',
            label: 'Type',
            description: 'Type switches the border style between solid, dashed and dotted.',
            load: () => import('./divider/type-doc').then((m) => m.TypeDoc)
        },
        {
            id: 'divider-vertical',
            label: 'Vertical',
            description: 'A vertical divider separates items placed side by side.',
            load: () => import('./divider/vertical-doc').then((m) => m.VerticalDoc)
        }
    ],
    skeleton: [
        {
            id: 'skeleton-basic',
            label: 'Basic',
            description: 'A skeleton stands in for content that has not arrived yet.',
            load: () => import('./skeleton/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'skeleton-shapes',
            label: 'Shapes and sizes',
            description: 'Shape, size, width, height and borderRadius describe the space being held.',
            load: () => import('./skeleton/shapes-doc').then((m) => m.ShapesDoc)
        },
        {
            id: 'skeleton-animation',
            label: 'Animation',
            description: 'Setting animation to none holds the space without moving.',
            load: () => import('./skeleton/animation-doc').then((m) => m.AnimationDoc)
        }
    ],
    progressbar: [
        {
            id: 'progressbar-basic',
            label: 'Basic',
            description: 'The value property drives the bar, and the label is shown by default.',
            load: () => import('./progressbar/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'progressbar-indeterminate',
            label: 'Indeterminate',
            description: 'Indeterminate mode is for work whose duration is not known.',
            load: () => import('./progressbar/indeterminate-doc').then((m) => m.IndeterminateDoc)
        },
        {
            id: 'progressbar-dynamic',
            label: 'Dynamic',
            description: 'Binding to a signal is enough; the bar follows whatever the value does.',
            load: () => import('./progressbar/dynamic-doc').then((m) => m.DynamicDoc)
        }
    ],
    progressspinner: [
        {
            id: 'progressspinner-basic',
            label: 'Basic',
            description: 'The spinner needs no configuration to run.',
            load: () => import('./progressspinner/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'progressspinner-custom',
            label: 'Custom',
            description: 'Stroke width, fill, duration and size are all adjustable.',
            load: () => import('./progressspinner/custom-doc').then((m) => m.CustomDoc)
        }
    ],
    message: [
        {
            id: 'message-basic',
            label: 'Basic',
            description: 'A message renders whatever is projected into it.',
            load: () => import('./message/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'message-severity',
            label: 'Severity',
            description: 'Severity decides the colour and the default icon.',
            load: () => import('./message/severity-doc').then((m) => m.SeverityDoc)
        },
        {
            id: 'message-icon',
            label: 'Icon',
            description: 'The icon property replaces the one severity would have chosen.',
            load: () => import('./message/icon-doc').then((m) => m.IconDoc)
        },
        {
            id: 'message-closable',
            label: 'Closable',
            description: 'A closable message gains a control that dismisses it.',
            load: () => import('./message/closable-doc').then((m) => m.ClosableDoc)
        }
    ],
    tooltip: [
        {
            id: 'tooltip-basic',
            label: 'Basic',
            description: 'aglTooltip attaches a tooltip to any element, with the text as its value.',
            load: () => import('./tooltip/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'tooltip-position',
            label: 'Position',
            description: 'tooltipPosition places the tooltip on any of the four sides.',
            load: () => import('./tooltip/position-doc').then((m) => m.PositionDoc)
        },
        {
            id: 'tooltip-delay',
            label: 'Delay',
            description: 'showDelay and hideDelay keep a tooltip from flickering on a passing cursor.',
            load: () => import('./tooltip/delay-doc').then((m) => m.DelayDoc)
        }
    ],
    ripple: [
        {
            id: 'ripple-basic',
            label: 'Basic',
            description: 'aglRipple adds the click ripple to any element that should feel pressable.',
            load: () => import('./ripple/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    iconfield: [
        {
            id: 'iconfield-basic',
            label: 'Basic',
            description: 'IconField wraps an input and an InputIcon so the two line up as one control.',
            load: () => import('./iconfield/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'iconfield-position',
            label: 'Position',
            description: 'The icon sits wherever it is written, before or after the input.',
            load: () => import('./iconfield/position-doc').then((m) => m.PositionDoc)
        }
    ],
    inputicon: [
        {
            id: 'inputicon-basic',
            label: 'Basic',
            description: 'InputIcon is the icon half of an IconField, and takes its icon from a class.',
            load: () => import('./inputicon/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    fluid: [
        {
            id: 'fluid-basic',
            label: 'Basic',
            description: 'Fluid makes the inputs inside it fill the width of their container.',
            load: () => import('./fluid/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    inputnumber: [
        {
            id: 'inputnumber-basic',
            label: 'Basic',
            description: 'InputNumber binds to a number and formats it for the locale.',
            load: () => import('./inputnumber/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'inputnumber-buttons',
            label: 'Buttons',
            description: 'showButtons adds spinners, stacked by default and horizontal on request.',
            load: () => import('./inputnumber/buttons-doc').then((m) => m.ButtonsDoc)
        },
        {
            id: 'inputnumber-currency',
            label: 'Currency',
            description: 'Currency mode formats the value for a currency and a locale.',
            load: () => import('./inputnumber/currency-doc').then((m) => m.CurrencyDoc)
        },
        {
            id: 'inputnumber-decimal',
            label: 'Decimals and affixes',
            description: 'Fraction digits, prefixes and suffixes are all properties rather than formatting done by hand.',
            load: () => import('./inputnumber/decimal-doc').then((m) => m.DecimalDoc)
        }
    ],
    password: [
        {
            id: 'password-basic',
            label: 'Basic',
            description: 'A plain password field, with the strength meter turned off.',
            load: () => import('./password/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'password-meter',
            label: 'Strength meter',
            description: 'Feedback is on by default and rates what is typed as it is typed.',
            load: () => import('./password/meter-doc').then((m) => m.MeterDoc)
        },
        {
            id: 'password-togglemask',
            label: 'Toggle mask',
            description: 'toggleMask adds the control that reveals what was typed.',
            load: () => import('./password/togglemask-doc').then((m) => m.ToggleMaskDoc)
        }
    ],
    textarea: [
        {
            id: 'textarea-basic',
            label: 'Basic',
            description: 'Textarea is a directive on a native textarea, so rows and cols keep working.',
            load: () => import('./textarea/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'textarea-autoresize',
            label: 'Auto resize',
            description: 'autoResize grows the field with its content instead of scrolling it.',
            load: () => import('./textarea/autoresize-doc').then((m) => m.AutoResizeDoc)
        },
        {
            id: 'textarea-invalid',
            label: 'Invalid',
            description: 'The invalid property styles the field as failing validation.',
            load: () => import('./textarea/invalid-doc').then((m) => m.InvalidDoc)
        }
    ],
    toggleswitch: [
        {
            id: 'toggleswitch-basic',
            label: 'Basic',
            description: 'A toggle switch binds to a boolean.',
            load: () => import('./toggleswitch/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'toggleswitch-preselection',
            label: 'Custom values',
            description: 'trueValue and falseValue replace the booleans with values of your own.',
            load: () => import('./toggleswitch/preselection-doc').then((m) => m.PreselectionDoc)
        },
        {
            id: 'toggleswitch-sizes',
            label: 'Sizes',
            description: 'Small and large are available as alternatives to the standard.',
            load: () => import('./toggleswitch/sizes-doc').then((m) => m.SizesDoc)
        }
    ],
    togglebutton: [
        {
            id: 'togglebutton-basic',
            label: 'Basic',
            description: 'A toggle button carries its own labels for each state.',
            load: () => import('./togglebutton/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'togglebutton-icons',
            label: 'Icons',
            description: 'onIcon and offIcon give each state its own icon.',
            load: () => import('./togglebutton/icons-doc').then((m) => m.IconsDoc)
        },
        {
            id: 'togglebutton-sizes',
            label: 'Sizes',
            description: 'Small and large are available as alternatives to the standard.',
            load: () => import('./togglebutton/sizes-doc').then((m) => m.SizesDoc)
        }
    ],
    selectbutton: [
        {
            id: 'selectbutton-basic',
            label: 'Basic',
            description: 'SelectButton is a single choice laid out as a row of buttons.',
            load: () => import('./selectbutton/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'selectbutton-multiple',
            label: 'Multiple',
            description: 'With multiple, the value becomes an array and several options can be on at once.',
            load: () => import('./selectbutton/multiple-doc').then((m) => m.MultipleDoc)
        }
    ],
    colorpicker: [
        {
            id: 'colorpicker-basic',
            label: 'Basic',
            description: 'The picker opens in an overlay and binds to a hex string.',
            load: () => import('./colorpicker/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'colorpicker-inline',
            label: 'Inline',
            description: 'An inline picker is always visible instead of opening in an overlay.',
            load: () => import('./colorpicker/inline-doc').then((m) => m.InlineDoc)
        },
        {
            id: 'colorpicker-format',
            label: 'Format',
            description: 'Format switches the bound value between hex, rgb and hsb.',
            load: () => import('./colorpicker/format-doc').then((m) => m.FormatDoc)
        }
    ],
    multiselect: [
        {
            id: 'multiselect-basic',
            label: 'Basic',
            description: 'MultiSelect binds to an array and summarises the selection in its label.',
            load: () => import('./multiselect/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'multiselect-chips',
            label: 'Chips',
            description: 'Chip display shows each selected item as its own removable chip.',
            load: () => import('./multiselect/chips-doc').then((m) => m.ChipsDoc)
        },
        {
            id: 'multiselect-filter',
            label: 'Filter',
            description: 'Filtering searches the properties named by filterBy.',
            load: () => import('./multiselect/filter-doc').then((m) => m.FilterDoc)
        }
    ],
    menu: [
        {
            id: 'menu-basic',
            label: 'Basic',
            description: 'Menu renders a MenuItem model, and nested items become groups.',
            load: () => import('./menu/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'menu-popup',
            label: 'Popup',
            description: 'A popup menu is opened from a trigger by calling toggle with the event.',
            load: () => import('./menu/popup-doc').then((m) => m.PopupDoc)
        }
    ],
    tieredmenu: [
        {
            id: 'tieredmenu-basic',
            label: 'Basic',
            description: 'TieredMenu is Menu with submenus that open on their own.',
            load: () => import('./tieredmenu/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'tieredmenu-popup',
            label: 'Popup',
            description: 'The same menu, opened from a trigger instead of sitting inline.',
            load: () => import('./tieredmenu/popup-doc').then((m) => m.PopupDoc)
        }
    ],
    splitbutton: [
        {
            id: 'splitbutton-basic',
            label: 'Basic',
            description: 'A split button pairs a default action with a menu of the rest.',
            load: () => import('./splitbutton/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'splitbutton-severity',
            label: 'Severity',
            description: 'Severity defines the colour, exactly as it does for Button.',
            load: () => import('./splitbutton/severity-doc').then((m) => m.SeverityDoc)
        },
        {
            id: 'splitbutton-outlined',
            label: 'Styles',
            description: 'Outlined, text and raised are the same style switches Button has.',
            load: () => import('./splitbutton/outlined-doc').then((m) => m.OutlinedDoc)
        }
    ],
    popover: [
        {
            id: 'popover-basic',
            label: 'Basic',
            description: 'A popover is anchored to whatever opened it and dismissed by clicking away.',
            load: () => import('./popover/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    drawer: [
        {
            id: 'drawer-basic',
            label: 'Basic',
            description: 'Visibility is controlled by the visible property and its visibleChange output.',
            load: () => import('./drawer/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'drawer-position',
            label: 'Position',
            description: 'Position decides which edge the drawer comes from.',
            load: () => import('./drawer/position-doc').then((m) => m.PositionDoc)
        },
        {
            id: 'drawer-fullscreen',
            label: 'Full screen',
            description: 'A full-screen drawer covers the viewport instead of one edge of it.',
            load: () => import('./drawer/fullscreen-doc').then((m) => m.FullScreenDoc)
        }
    ],
    confirmdialog: [
        {
            id: 'confirmdialog-basic',
            label: 'Basic',
            description: 'ConfirmDialog renders what ConfirmationService is asked to confirm; the service is provided by the component that owns the dialog.',
            load: () => import('./confirmdialog/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    paginator: [
        {
            id: 'paginator-basic',
            label: 'Basic',
            description: 'Paginator reports the page it moved to; the caller owns first and rows.',
            load: () => import('./paginator/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'paginator-rowsperpage',
            label: 'Rows per page',
            description: 'rowsPerPageOptions adds the control that changes the page size.',
            load: () => import('./paginator/rowsperpage-doc').then((m) => m.RowsPerPageDoc)
        }
    ],
    timeline: [
        {
            id: 'timeline-basic',
            label: 'Basic',
            description: 'Timeline lays out a list of events, with the content slot rendering each one.',
            load: () => import('./timeline/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'timeline-horizontal',
            label: 'Horizontal',
            description: 'Layout switches the axis; align decides which side the content sits on.',
            load: () => import('./timeline/horizontal-doc').then((m) => m.HorizontalDoc)
        },
        {
            id: 'timeline-opposite',
            label: 'Opposite',
            description: 'The opposite slot fills the other side of the axis.',
            load: () => import('./timeline/opposite-doc').then((m) => m.OppositeDoc)
        }
    ],
    autofocus: [
        {
            id: 'autofocus-basic',
            label: 'Basic',
            description: 'aglAutoFocus puts the cursor in a field as soon as it renders.',
            load: () => import('./autofocus/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    focustrap: [
        {
            id: 'focustrap-basic',
            label: 'Basic',
            description: 'aglFocusTrap keeps keyboard focus inside its element, which is what makes a dialog usable without a mouse.',
            load: () => import('./focustrap/basic-doc').then((m) => m.FocusTrapDoc)
        }
    ],
    bind: [
        {
            id: 'bind-basic',
            label: 'Basic',
            description: 'aglBind applies a whole object of attributes in one binding.',
            load: () => import('./bind/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    icons: [
        {
            id: 'icons-basic',
            label: 'Basic',
            description: 'The icon set the library uses internally, addressed by a data attribute so no icon font is required.',
            load: () => import('./icons/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'icons-spin',
            label: 'Spin',
            description: 'Any icon can spin, which is how the loading states are drawn.',
            load: () => import('./icons/spin-doc').then((m) => m.SpinDoc)
        }
    ],
    overlay: [
        {
            id: 'overlay-basic',
            label: 'Basic',
            description: 'Overlay is the positioning primitive that select, popover and the menus are built on.',
            load: () => import('./overlay/basic-doc').then((m) => m.BasicDoc)
        }
    ],
    scroller: [
        {
            id: 'scroller-basic',
            label: 'Basic',
            description: 'Ten thousand rows, of which only the visible ones are in the DOM.',
            load: () => import('./scroller/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'scroller-horizontal',
            label: 'Horizontal',
            description: 'Orientation switches the axis being virtualised.',
            load: () => import('./scroller/horizontal-doc').then((m) => m.HorizontalDoc)
        }
    ],
    fileupload: [
        {
            id: 'fileupload-basic',
            label: 'Basic',
            description: 'Basic mode is a single choose control; customUpload hands the files to your own code instead of posting them.',
            load: () => import('./fileupload/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'fileupload-advanced',
            label: 'Advanced',
            description: 'The full control adds drag and drop, a file list and progress.',
            load: () => import('./fileupload/advanced-doc').then((m) => m.AdvancedDoc)
        }
    ],
    chart: [
        {
            id: 'chart-basic',
            label: 'Basic',
            description: 'Chart wraps Chart.js: type, data and options are passed straight through.',
            load: () => import('./chart/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'chart-doughnut',
            label: 'Doughnut',
            description: 'The same component draws every Chart.js type.',
            load: () => import('./chart/doughnut-doc').then((m) => m.DoughnutDoc)
        }
    ],
    table: [
        {
            id: 'table-basic',
            label: 'Basic',
            description: 'Table renders rows through the body slot, so the markup of a row stays yours.',
            load: () => import('./table/basic-doc').then((m) => m.BasicDoc)
        },
        {
            id: 'table-paginator',
            label: 'Paginator',
            description: 'Setting paginator and rows is enough; the control appears and drives the page.',
            load: () => import('./table/paginator-doc').then((m) => m.PaginatorDoc)
        },
        {
            id: 'table-sort',
            label: 'Sort',
            description: 'aglSortableColumn makes a header sortable, and agl-sortIcon shows which way.',
            load: () => import('./table/sort-doc').then((m) => m.SortDoc)
        },
        {
            id: 'table-selection',
            label: 'Selection',
            description: 'Selection is two-way bound, and aglSelectableRow marks what can be selected.',
            load: () => import('./table/selection-doc').then((m) => m.SelectionDoc)
        }
    ],
    treetable: [
        {
            id: 'treetable-basic',
            label: 'Basic',
            description: 'TreeTable is Table over a TreeNode hierarchy, with a toggler for each branch.',
            load: () => import('./treetable/basic-doc').then((m) => m.BasicDoc)
        }
    ]
};
