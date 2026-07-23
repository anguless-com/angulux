import type { ElementRef, TemplateRef } from '@angular/core';
import type { OverlayOptions, PassThroughOptions, Translation } from '@anguless/angulux/api';
import type { AccordionPassThrough } from '@anguless/angulux/types/accordion';
import type { AutoCompletePassThrough } from '@anguless/angulux/types/autocomplete';
import type { AvatarPassThrough } from '@anguless/angulux/types/avatar';
import type { AvatarGroupPassThrough } from '@anguless/angulux/types/avatargroup';
import type { BadgePassThrough } from '@anguless/angulux/types/badge';
import type { BlockUIPassThrough } from '@anguless/angulux/types/blockui';
import type { BreadcrumbPassThrough } from '@anguless/angulux/types/breadcrumb';
import type { ButtonPassThrough } from '@anguless/angulux/types/button';
import type { CardPassThrough } from '@anguless/angulux/types/card';
import type { CarouselPassThrough } from '@anguless/angulux/types/carousel';
import type { CascadeSelectPassThrough } from '@anguless/angulux/types/cascadeselect';
import type { CheckboxPassThrough } from '@anguless/angulux/types/checkbox';
import type { ChipPassThrough } from '@anguless/angulux/types/chip';
import type { ColorPickerPassThrough } from '@anguless/angulux/types/colorpicker';
import type { ConfirmDialogPassThrough } from '@anguless/angulux/types/confirmdialog';
import type { ConfirmPopupPassThrough } from '@anguless/angulux/types/confirmpopup';
import type { DialogPassThrough } from '@anguless/angulux/types/dialog';
import type { DividerPassThrough } from '@anguless/angulux/types/divider';
import type { DockPassThrough } from '@anguless/angulux/types/dock';
import type { DrawerPassThrough } from '@anguless/angulux/types/drawer';
import type { EditorPassThrough } from '@anguless/angulux/types/editor';
import type { FieldsetPassThrough } from '@anguless/angulux/types/fieldset';
import type { FileUploadPassThrough } from '@anguless/angulux/types/fileupload';
import type { FloatLabelPassThrough } from '@anguless/angulux/types/floatlabel';
import type { FluidPassThrough } from '@anguless/angulux/types/fluid';
import type { GalleriaPassThrough } from '@anguless/angulux/types/galleria';
import type { IconFieldPassThrough } from '@anguless/angulux/types/iconfield';
import type { IftaLabelPassThrough } from '@anguless/angulux/types/iftalabel';
import type { ImagePassThrough } from '@anguless/angulux/types/image';
import type { ImageComparePassThrough } from '@anguless/angulux/types/imagecompare';
import type { InplacePassThrough } from '@anguless/angulux/types/inplace';
import type { InputGroupPassThrough } from '@anguless/angulux/types/inputgroup';
import type { InputGroupAddonPassThrough } from '@anguless/angulux/types/inputgroupaddon';
import type { InputIconPassThrough } from '@anguless/angulux/types/inputicon';
import type { InputMaskPassThrough } from '@anguless/angulux/types/inputmask';
import type { InputNumberPassThrough } from '@anguless/angulux/types/inputnumber';
import type { InputOtpPassThrough } from '@anguless/angulux/types/inputotp';
import type { InputTextPassThrough } from '@anguless/angulux/types/inputtext';
import type { KnobPassThrough } from '@anguless/angulux/types/knob';
import type { MegaMenuPassThrough } from '@anguless/angulux/types/megamenu';
import type { MenuPassThrough } from '@anguless/angulux/types/menu';
import type { MenubarPassThrough } from '@anguless/angulux/types/menubar';
import type { MessagePassThrough } from '@anguless/angulux/types/message';
import type { MeterGroupPassThrough } from '@anguless/angulux/types/metergroup';
import type { OrderListPassThrough } from '@anguless/angulux/types/orderlist';
import type { OrganizationChartPassThrough } from '@anguless/angulux/types/organizationchart';
import type { OverlayBadgePassThrough } from '@anguless/angulux/types/overlaybadge';
import type { PanelPassThrough } from '@anguless/angulux/types/panel';
import type { PanelMenuPassThrough } from '@anguless/angulux/types/panelmenu';
import type { PopoverPassThrough } from '@anguless/angulux/types/popover';
import type { ProgressBarPassThrough } from '@anguless/angulux/types/progressbar';
import type { ProgressSpinnerPassThrough } from '@anguless/angulux/types/progressspinner';
import type { RadioButtonPassThrough } from '@anguless/angulux/types/radiobutton';
import type { RatingPassThrough } from '@anguless/angulux/types/rating';
import type { VirtualScrollerPassThrough } from '@anguless/angulux/types/scroller';
import type { ScrollPanelPassThrough } from '@anguless/angulux/types/scrollpanel';
import type { ScrollTopPassThrough } from '@anguless/angulux/types/scrolltop';
import type { SelectPassThrough } from '@anguless/angulux/types/select';
import type { SelectButtonPassThrough } from '@anguless/angulux/types/selectbutton';
import type { SkeletonPassThrough } from '@anguless/angulux/types/skeleton';
import type { SliderPassThrough } from '@anguless/angulux/types/slider';
import type { SpeedDialPassThrough } from '@anguless/angulux/types/speeddial';
import type { SplitButtonPassThrough } from '@anguless/angulux/types/splitbutton';
import type { SplitterPassThrough } from '@anguless/angulux/types/splitter';
import type { StepperPassThrough } from '@anguless/angulux/types/stepper';
import type { ColumnFilterPassThrough, TablePassThrough } from '@anguless/angulux/types/table';
import type { TabListPassThrough, TabPanelPassThrough, TabPanelsPassThrough, TabPassThrough, TabsPassThrough } from '@anguless/angulux/types/tabs';
import type { TagPassThrough } from '@anguless/angulux/types/tag';
import type { TerminalPassThrough } from '@anguless/angulux/types/terminal';
import type { TieredMenuPassThrough } from '@anguless/angulux/types/tieredmenu';
import type { TimelinePassThrough } from '@anguless/angulux/types/timeline';
import type { ToastPassThrough } from '@anguless/angulux/types/toast';
import type { ToggleButtonPassThrough } from '@anguless/angulux/types/togglebutton';
import type { ToggleSwitchPassThrough } from '@anguless/angulux/types/toggleswitch';
import type { ToolbarPassThrough } from '@anguless/angulux/types/toolbar';
import type { TreePassThrough } from '@anguless/angulux/types/tree';
import type { TreeSelectPassThrough } from '@anguless/angulux/types/treeselect';
import type { TreeTablePassThrough } from '@anguless/angulux/types/treetable';

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
