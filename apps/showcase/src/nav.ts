import { ResolveFn } from '@angular/router';
import { ApiIndexEntry, loadApiIndex } from './data';

/**
 * How the sidebar names and groups the modules.
 *
 * NAMES are read from the corpus, not written here. A module's name is the class it is named
 * after: the `datepicker` entry point declares `DatePicker`, so the sidebar, the page heading and
 * the browser tab say DatePicker, and a reader who searches the page for the class they import
 * finds it. The match is case-insensitive and exact, which settles every component module.
 * `TITLES` covers the two that publish under another name; the rest of the modules without a
 * match declare nothing a template uses (`api`, `utils`, the base classes) and keep their
 * entry-point name, in monospace, because that is what a reader writes.
 *
 * GROUPS are the one hand-kept list, because nothing in the source says what a module is for.
 * A module missing from them is not hidden: it lands in "Other", and `showcase-sidebar.spec.ts`
 * fails until it is given a group, so a promotion out of the attic cannot leave it there.
 */

/** The written pages, first in the sidebar and first in the reading order. Hand-kept: no generated source knows about them. */
export const GUIDE_PAGES: readonly { path: string; label: string }[] = [
    { path: '/getting-started', label: 'Getting started' },
    { path: '/theming', label: 'Theming' }
];

export interface NavGroup {
    label: string;
    modules: readonly string[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
    {
        label: 'Form controls',
        modules: ['checkbox', 'colorpicker', 'datepicker', 'fileupload', 'inputnumber', 'inputtext', 'multiselect', 'password', 'radiobutton', 'select', 'selectbutton', 'textarea', 'togglebutton', 'toggleswitch']
    },
    { label: 'Form layout', modules: ['fluid', 'iconfield', 'iftalabel', 'inputicon'] },
    { label: 'Buttons and menus', modules: ['button', 'splitbutton', 'menu', 'tieredmenu'] },
    { label: 'Data', modules: ['table', 'treetable', 'paginator', 'scroller', 'timeline', 'chart'] },
    { label: 'Overlays', modules: ['dialog', 'confirmdialog', 'drawer', 'popover', 'tooltip', 'overlay'] },
    { label: 'Feedback', modules: ['message', 'toast', 'progressbar', 'progressspinner', 'skeleton'] },
    { label: 'Layout', modules: ['card', 'divider', 'tabs'] },
    { label: 'Display', modules: ['avatar', 'avatargroup', 'badge', 'chip', 'tag', 'icons'] },
    { label: 'Behaviour', modules: ['autofocus', 'focustrap', 'ripple', 'bind', 'motion'] },
    { label: 'Core', modules: ['api', 'config', 'usestyle', 'base', 'basecomponent', 'baseeditableholder', 'baseinput', 'basemodelholder', 'dom', 'utils', 'types', 'ts-helpers'] }
];

/** The heading of the group a module the list does not know about falls into. */
export const UNGROUPED = 'Other';

/** Modules whose class is named differently from the entry point: `chart` declares `UIChart`. */
const TITLES: Readonly<Record<string, string>> = { chart: 'Chart', icons: 'Icons' };

/** The class a module is named after, or null when it declares none (then the entry-point name is shown). */
export function moduleTitle(entry: Pick<ApiIndexEntry, 'name' | 'declares'>): string | null {
    return TITLES[entry.name] ?? entry.declares.find((declared) => declared.toLowerCase() === entry.name) ?? null;
}

export interface NavItem {
    entry: ApiIndexEntry;
    /** What the link says. */
    label: string;
    /** True when `label` is an entry-point name rather than a class name: shown in monospace. */
    code: boolean;
}

export interface NavSection {
    label: string;
    items: NavItem[];
}

/**
 * The index, arranged into the groups, each sorted by what its links say. Empty groups are left
 * out, so a filter that matches nothing in a group also removes its heading.
 */
export function navSections(entries: readonly ApiIndexEntry[]): NavSection[] {
    const byName = new Map(entries.map((entry) => [entry.name, entry]));
    const placed = new Set<string>();
    const toItem = (entry: ApiIndexEntry): NavItem => {
        const title = moduleTitle(entry);

        return { entry, label: title ?? entry.name, code: title === null };
    };
    const section = (label: string, members: ApiIndexEntry[]): NavSection => ({
        label,
        items: members.map(toItem).sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))
    });

    const sections = NAV_GROUPS.map((group) => {
        const members = group.modules.flatMap((name) => byName.get(name) ?? []);

        members.forEach((entry) => placed.add(entry.name));

        return section(group.label, members);
    });

    sections.push(section(UNGROUPED, entries.filter((entry) => !placed.has(entry.name))));

    return sections.filter((s) => s.items.length);
}

/**
 * Every page in the order the sidebar lists it: the guide, then each group's modules. The
 * previous and next links at the foot of a page walk this list.
 */
export function readingOrder(entries: readonly ApiIndexEntry[]): { path: string; label: string }[] {
    return [...GUIDE_PAGES, ...navSections(entries).flatMap((section) => section.items.map((item) => ({ path: `/${item.entry.name}`, label: item.label })))];
}

/**
 * The browser tab's text for a module page, settled before the page renders so the prerendered
 * HTML already carries it: a search result and a tab strip then say "DatePicker" instead of the
 * same "angulux — documentation" on every page.
 */
export const moduleTabTitle: ResolveFn<string> = async (route) => {
    const name = route.paramMap.get('module') ?? '';
    const entry = (await loadApiIndex()).find((candidate) => candidate.name === name);

    return `${(entry && moduleTitle(entry)) ?? name} — angulux`;
};
