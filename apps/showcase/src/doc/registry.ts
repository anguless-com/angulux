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
    ]
};
