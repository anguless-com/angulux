import type { ElementRef, TemplateRef } from '@angular/core';
import type { OverlayOptions, PassThroughOptions, Translation } from 'angulux/api';
import type { AccordionPassThrough } from 'angulux/types/accordion';
import type { AutoCompletePassThrough } from 'angulux/types/autocomplete';
import type { AvatarPassThrough } from 'angulux/types/avatar';
import type { AvatarGroupPassThrough } from 'angulux/types/avatargroup';
import type { BadgePassThrough } from 'angulux/types/badge';
import type { BlockUIPassThrough } from 'angulux/types/blockui';
import type { BreadcrumbPassThrough } from 'angulux/types/breadcrumb';
import type { ButtonPassThrough } from 'angulux/types/button';
import type { CardPassThrough } from 'angulux/types/card';
import type { CarouselPassThrough } from 'angulux/types/carousel';
import type { CascadeSelectPassThrough } from 'angulux/types/cascadeselect';
import type { CheckboxPassThrough } from 'angulux/types/checkbox';
import type { ChipPassThrough } from 'angulux/types/chip';
import type { ColorPickerPassThrough } from 'angulux/types/colorpicker';
import type { ConfirmDialogPassThrough } from 'angulux/types/confirmdialog';
import type { ConfirmPopupPassThrough } from 'angulux/types/confirmpopup';
import type { DialogPassThrough } from 'angulux/types/dialog';
import type { DividerPassThrough } from 'angulux/types/divider';
import type { DockPassThrough } from 'angulux/types/dock';
import type { DrawerPassThrough } from 'angulux/types/drawer';
import type { EditorPassThrough } from 'angulux/types/editor';
import type { FieldsetPassThrough } from 'angulux/types/fieldset';
import type { FileUploadPassThrough } from 'angulux/types/fileupload';
import type { FloatLabelPassThrough } from 'angulux/types/floatlabel';
import type { FluidPassThrough } from 'angulux/types/fluid';
import type { GalleriaPassThrough } from 'angulux/types/galleria';
import type { IconFieldPassThrough } from 'angulux/types/iconfield';
import type { IftaLabelPassThrough } from 'angulux/types/iftalabel';
import type { ImagePassThrough } from 'angulux/types/image';
import type { ImageComparePassThrough } from 'angulux/types/imagecompare';
import type { InplacePassThrough } from 'angulux/types/inplace';
import type { InputGroupPassThrough } from 'angulux/types/inputgroup';
import type { InputGroupAddonPassThrough } from 'angulux/types/inputgroupaddon';
import type { InputIconPassThrough } from 'angulux/types/inputicon';
import type { InputMaskPassThrough } from 'angulux/types/inputmask';
import type { InputNumberPassThrough } from 'angulux/types/inputnumber';
import type { InputOtpPassThrough } from 'angulux/types/inputotp';
import type { InputTextPassThrough } from 'angulux/types/inputtext';
import type { KnobPassThrough } from 'angulux/types/knob';
import type { MegaMenuPassThrough } from 'angulux/types/megamenu';
import type { MenuPassThrough } from 'angulux/types/menu';
import type { MenubarPassThrough } from 'angulux/types/menubar';
import type { MessagePassThrough } from 'angulux/types/message';
import type { MeterGroupPassThrough } from 'angulux/types/metergroup';
import type { OrderListPassThrough } from 'angulux/types/orderlist';
import type { OrganizationChartPassThrough } from 'angulux/types/organizationchart';
import type { OverlayBadgePassThrough } from 'angulux/types/overlaybadge';
import type { PanelPassThrough } from 'angulux/types/panel';
import type { PanelMenuPassThrough } from 'angulux/types/panelmenu';
import type { PopoverPassThrough } from 'angulux/types/popover';
import type { ProgressBarPassThrough } from 'angulux/types/progressbar';
import type { ProgressSpinnerPassThrough } from 'angulux/types/progressspinner';
import type { RadioButtonPassThrough } from 'angulux/types/radiobutton';
import type { RatingPassThrough } from 'angulux/types/rating';
import type { VirtualScrollerPassThrough } from 'angulux/types/scroller';
import type { ScrollPanelPassThrough } from 'angulux/types/scrollpanel';
import type { ScrollTopPassThrough } from 'angulux/types/scrolltop';
import type { SelectPassThrough } from 'angulux/types/select';
import type { SelectButtonPassThrough } from 'angulux/types/selectbutton';
import type { SkeletonPassThrough } from 'angulux/types/skeleton';
import type { SliderPassThrough } from 'angulux/types/slider';
import type { SpeedDialPassThrough } from 'angulux/types/speeddial';
import type { SplitButtonPassThrough } from 'angulux/types/splitbutton';
import type { SplitterPassThrough } from 'angulux/types/splitter';
import type { StepperPassThrough } from 'angulux/types/stepper';
import type { ColumnFilterPassThrough, TablePassThrough } from 'angulux/types/table';
import type { TabListPassThrough, TabPanelPassThrough, TabPanelsPassThrough, TabPassThrough, TabsPassThrough } from 'angulux/types/tabs';
import type { TagPassThrough } from 'angulux/types/tag';
import type { TerminalPassThrough } from 'angulux/types/terminal';
import type { TieredMenuPassThrough } from 'angulux/types/tieredmenu';
import type { TimelinePassThrough } from 'angulux/types/timeline';
import type { ToastPassThrough } from 'angulux/types/toast';
import type { ToggleButtonPassThrough } from 'angulux/types/togglebutton';
import type { ToggleSwitchPassThrough } from 'angulux/types/toggleswitch';
import type { ToolbarPassThrough } from 'angulux/types/toolbar';
import type { TreePassThrough } from 'angulux/types/tree';
import type { TreeSelectPassThrough } from 'angulux/types/treeselect';
import type { TreeTablePassThrough } from 'angulux/types/treetable';

/** ZIndex configuration */
export type ZIndex = {
    modal: number;
    overlay: number;
    menu: number;
    tooltip: number;
};

/** Theme configuration */
export type ThemeType = { preset?: any; options?: any } | 'none' | boolean | undefined;

export type ThemeConfigType = {
    theme?: ThemeType;
    csp?: {
        nonce: string | undefined;
    };
};

export interface GlobalPassThrough {
    accordion?: AccordionPassThrough;
    autoComplete?: AutoCompletePassThrough;
    avatar?: AvatarPassThrough;
    avatarGroup?: AvatarGroupPassThrough;
    blockUI?: BlockUIPassThrough;
    breadcrumb?: BreadcrumbPassThrough;
    card?: CardPassThrough;
    carousel?: CarouselPassThrough;
    cascadeSelect?: CascadeSelectPassThrough;
    checkbox?: CheckboxPassThrough;
    chip?: ChipPassThrough;
    colorPicker?: ColorPickerPassThrough;
    columnFilter?: ColumnFilterPassThrough;
    confirmDialog?: ConfirmDialogPassThrough;
    confirmPopup?: ConfirmPopupPassThrough;
    dialog?: DialogPassThrough;
    divider?: DividerPassThrough;
    dock?: DockPassThrough;
    megaMenu?: MegaMenuPassThrough;
    drawer?: DrawerPassThrough;
    editor?: EditorPassThrough;
    fileUpload?: FileUploadPassThrough;
    floatLabel?: FloatLabelPassThrough;
    menu?: MenuPassThrough;
    menubar?: MenubarPassThrough;
    fluid?: FluidPassThrough;
    galleria?: GalleriaPassThrough;
    iconField?: IconFieldPassThrough;
    iftaLabel?: IftaLabelPassThrough;
    inputIcon?: InputIconPassThrough;
    image?: ImagePassThrough;
    imageCompare?: ImageComparePassThrough;
    inplace?: InplacePassThrough;
    inputText?: InputTextPassThrough;
    inputGroup?: InputGroupPassThrough;
    inputGroupAddon?: InputGroupAddonPassThrough;
    inputMask?: InputMaskPassThrough;
    inputNumber?: InputNumberPassThrough;
    inputOtp?: InputOtpPassThrough;
    knob?: KnobPassThrough;
    popover?: PopoverPassThrough;
    message?: MessagePassThrough;
    meterGroup?: MeterGroupPassThrough;
    orderList?: OrderListPassThrough;
    organizationChart?: OrganizationChartPassThrough;
    overlayBadge?: OverlayBadgePassThrough;
    progressBar?: ProgressBarPassThrough;
    progressSpinner?: ProgressSpinnerPassThrough;
    radioButton?: RadioButtonPassThrough;
    rating?: RatingPassThrough;
    virtualScroller?: VirtualScrollerPassThrough;
    scrollPanel?: ScrollPanelPassThrough;
    scrollTop?: ScrollTopPassThrough;
    select?: SelectPassThrough;
    selectButton?: SelectButtonPassThrough;
    skeleton?: SkeletonPassThrough;
    slider?: SliderPassThrough;
    speedDial?: SpeedDialPassThrough;
    splitButton?: SplitButtonPassThrough;
    splitter?: SplitterPassThrough;
    stepper?: StepperPassThrough;
    tabs?: TabsPassThrough;
    tab?: TabPassThrough;
    tabList?: TabListPassThrough;
    tabPanel?: TabPanelPassThrough;
    tabPanels?: TabPanelsPassThrough;
    table?: TablePassThrough;
    tieredMenu?: TieredMenuPassThrough;
    timeline?: TimelinePassThrough;
    tag?: TagPassThrough;
    terminal?: TerminalPassThrough;
    toast?: ToastPassThrough;
    toggleButton?: ToggleButtonPassThrough;
    toggleSwitch?: ToggleSwitchPassThrough;
    toolbar?: ToolbarPassThrough;
    tree?: TreePassThrough;
    treeSelect?: TreeSelectPassThrough;
    treeTable?: TreeTablePassThrough;
    panel?: PanelPassThrough;
    panelMenu?: PanelMenuPassThrough;
    button?: ButtonPassThrough;
    badge?: BadgePassThrough;
    fieldset?: FieldsetPassThrough;
    global?: {
        css?: string;
    };
    [key: string]: any;
}

export type AnguluxConfigType = {
    ripple?: boolean;
    overlayAppendTo?: HTMLElement | ElementRef | TemplateRef<any> | string | null | undefined | any;
    /**
     * @deprecated Since v20. Use `inputVariant` instead.
     */
    inputStyle?: 'outlined' | 'filled';
    inputVariant?: 'outlined' | 'filled';
    overlayOptions?: OverlayOptions;
    translation?: Translation;
    /**
     * @experimental
     * This property is not yet implemented. It will be available in a future release.
     */
    unstyled?: boolean;
    zIndex?: ZIndex | null | undefined;
    pt?: GlobalPassThrough | null | undefined;
    ptOptions?: PassThroughOptions | null | undefined;
    filterMatchModeOptions?: any;
} & ThemeConfigType;
