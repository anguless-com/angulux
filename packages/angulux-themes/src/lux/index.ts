import type { Preset } from '@anguless/angulux-themes/types';
import type { LuxBaseDesignTokens } from './base/index.d';

import accordion from '@anguless/angulux-themes/lux/accordion';
import autocomplete from '@anguless/angulux-themes/lux/autocomplete';
import avatar from '@anguless/angulux-themes/lux/avatar';
import badge from '@anguless/angulux-themes/lux/badge';
import base from '@anguless/angulux-themes/lux/base';
import blockui from '@anguless/angulux-themes/lux/blockui';
import breadcrumb from '@anguless/angulux-themes/lux/breadcrumb';
import button from '@anguless/angulux-themes/lux/button';
import card from '@anguless/angulux-themes/lux/card';
import carousel from '@anguless/angulux-themes/lux/carousel';
import cascadeselect from '@anguless/angulux-themes/lux/cascadeselect';
import checkbox from '@anguless/angulux-themes/lux/checkbox';
import chip from '@anguless/angulux-themes/lux/chip';
import colorpicker from '@anguless/angulux-themes/lux/colorpicker';
import confirmdialog from '@anguless/angulux-themes/lux/confirmdialog';
import confirmpopup from '@anguless/angulux-themes/lux/confirmpopup';
import contextmenu from '@anguless/angulux-themes/lux/contextmenu';
import css from '@anguless/angulux-themes/lux/css';
import datatable from '@anguless/angulux-themes/lux/datatable';
import dataview from '@anguless/angulux-themes/lux/dataview';
import datepicker from '@anguless/angulux-themes/lux/datepicker';
import dialog from '@anguless/angulux-themes/lux/dialog';
import divider from '@anguless/angulux-themes/lux/divider';
import dock from '@anguless/angulux-themes/lux/dock';
import drawer from '@anguless/angulux-themes/lux/drawer';
import editor from '@anguless/angulux-themes/lux/editor';
import fieldset from '@anguless/angulux-themes/lux/fieldset';
import fileupload from '@anguless/angulux-themes/lux/fileupload';
import floatlabel from '@anguless/angulux-themes/lux/floatlabel';
import galleria from '@anguless/angulux-themes/lux/galleria';
import iconfield from '@anguless/angulux-themes/lux/iconfield';
import iftalabel from '@anguless/angulux-themes/lux/iftalabel';
import image from '@anguless/angulux-themes/lux/image';
import imagecompare from '@anguless/angulux-themes/lux/imagecompare';
import inlinemessage from '@anguless/angulux-themes/lux/inlinemessage';
import inplace from '@anguless/angulux-themes/lux/inplace';
import inputchips from '@anguless/angulux-themes/lux/inputchips';
import inputgroup from '@anguless/angulux-themes/lux/inputgroup';
import inputnumber from '@anguless/angulux-themes/lux/inputnumber';
import inputotp from '@anguless/angulux-themes/lux/inputotp';
import inputtext from '@anguless/angulux-themes/lux/inputtext';
import knob from '@anguless/angulux-themes/lux/knob';
import listbox from '@anguless/angulux-themes/lux/listbox';
import megamenu from '@anguless/angulux-themes/lux/megamenu';
import menu from '@anguless/angulux-themes/lux/menu';
import menubar from '@anguless/angulux-themes/lux/menubar';
import message from '@anguless/angulux-themes/lux/message';
import metergroup from '@anguless/angulux-themes/lux/metergroup';
import multiselect from '@anguless/angulux-themes/lux/multiselect';
import orderlist from '@anguless/angulux-themes/lux/orderlist';
import organizationchart from '@anguless/angulux-themes/lux/organizationchart';
import overlaybadge from '@anguless/angulux-themes/lux/overlaybadge';
import paginator from '@anguless/angulux-themes/lux/paginator';
import panel from '@anguless/angulux-themes/lux/panel';
import panelmenu from '@anguless/angulux-themes/lux/panelmenu';
import password from '@anguless/angulux-themes/lux/password';
import picklist from '@anguless/angulux-themes/lux/picklist';
import popover from '@anguless/angulux-themes/lux/popover';
import progressbar from '@anguless/angulux-themes/lux/progressbar';
import progressspinner from '@anguless/angulux-themes/lux/progressspinner';
import radiobutton from '@anguless/angulux-themes/lux/radiobutton';
import rating from '@anguless/angulux-themes/lux/rating';
import ripple from '@anguless/angulux-themes/lux/ripple';
import scrollpanel from '@anguless/angulux-themes/lux/scrollpanel';
import select from '@anguless/angulux-themes/lux/select';
import selectbutton from '@anguless/angulux-themes/lux/selectbutton';
import skeleton from '@anguless/angulux-themes/lux/skeleton';
import slider from '@anguless/angulux-themes/lux/slider';
import speeddial from '@anguless/angulux-themes/lux/speeddial';
import splitbutton from '@anguless/angulux-themes/lux/splitbutton';
import splitter from '@anguless/angulux-themes/lux/splitter';
import stepper from '@anguless/angulux-themes/lux/stepper';
import steps from '@anguless/angulux-themes/lux/steps';
import tabmenu from '@anguless/angulux-themes/lux/tabmenu';
import tabs from '@anguless/angulux-themes/lux/tabs';
import tabview from '@anguless/angulux-themes/lux/tabview';
import tag from '@anguless/angulux-themes/lux/tag';
import terminal from '@anguless/angulux-themes/lux/terminal';
import textarea from '@anguless/angulux-themes/lux/textarea';
import tieredmenu from '@anguless/angulux-themes/lux/tieredmenu';
import timeline from '@anguless/angulux-themes/lux/timeline';
import toast from '@anguless/angulux-themes/lux/toast';
import togglebutton from '@anguless/angulux-themes/lux/togglebutton';
import toggleswitch from '@anguless/angulux-themes/lux/toggleswitch';
import toolbar from '@anguless/angulux-themes/lux/toolbar';
import tooltip from '@anguless/angulux-themes/lux/tooltip';
import tree from '@anguless/angulux-themes/lux/tree';
import treeselect from '@anguless/angulux-themes/lux/treeselect';
import treetable from '@anguless/angulux-themes/lux/treetable';
import virtualscroller from '@anguless/angulux-themes/lux/virtualscroller';

export default {
    ...base,
    components: {
        accordion,
        autocomplete,
        avatar,
        badge,
        blockui,
        breadcrumb,
        button,
        card,
        carousel,
        cascadeselect,
        checkbox,
        chip,
        colorpicker,
        confirmdialog,
        confirmpopup,
        contextmenu,
        datatable,
        dataview,
        datepicker,
        dialog,
        divider,
        dock,
        drawer,
        editor,
        fieldset,
        fileupload,
        floatlabel,
        galleria,
        iconfield,
        iftalabel,
        image,
        imagecompare,
        inlinemessage,
        inplace,
        inputchips,
        inputgroup,
        inputnumber,
        inputotp,
        inputtext,
        knob,
        listbox,
        megamenu,
        menu,
        menubar,
        message,
        metergroup,
        multiselect,
        orderlist,
        organizationchart,
        overlaybadge,
        paginator,
        panel,
        panelmenu,
        password,
        picklist,
        popover,
        progressbar,
        progressspinner,
        radiobutton,
        rating,
        ripple,
        scrollpanel,
        select,
        selectbutton,
        skeleton,
        slider,
        speeddial,
        splitbutton,
        splitter,
        stepper,
        steps,
        tabmenu,
        tabs,
        tabview,
        tag,
        terminal,
        textarea,
        tieredmenu,
        timeline,
        toast,
        togglebutton,
        toggleswitch,
        toolbar,
        tooltip,
        tree,
        treeselect,
        treetable,
        virtualscroller
    },
    css
} satisfies Preset<LuxBaseDesignTokens>;
