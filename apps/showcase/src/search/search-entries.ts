import { SearchIndex } from '../data';
import { GUIDE_PAGES, moduleTitle } from '../nav';

export type EntryKind = 'page' | 'module' | 'component' | 'directive' | 'input' | 'output' | 'slot';

export interface SearchEntry {
    kind: EntryKind;
    /** What the result says. */
    label: string;
    /** Where it lives, under the label. */
    context: string;
    path: string;
    fragment?: string;
    /** The label, lowercased, for matching. */
    key: string;
    /** Other text that should find it: the entry-point name, the selector. Lowercased. */
    also: string;
}

/** Earlier kinds come first among equally good matches: a page before a component, a component before one of its inputs. */
const KIND_ORDER: Record<EntryKind, number> = { page: 0, module: 1, component: 2, directive: 2, input: 3, output: 4, slot: 5 };

const MEMBER_KIND = { i: 'input', o: 'output', s: 'slot' } as const;

/**
 * Every result search can offer, built once from the index.
 *
 * A declaration named like its module (`DatePicker` in `datepicker`) is left out: the module's
 * own entry already goes to that page, and two results with the same name and the same
 * destination are one too many. Inputs, outputs and slots go to their declaration's heading on
 * the page that documents it.
 */
export function searchEntries(index: SearchIndex): SearchEntry[] {
    const entries: SearchEntry[] = GUIDE_PAGES.map((page) => entry('page', page.label, 'Guide', page.path));
    const titles = index.modules.map(([name, declares]) => moduleTitle({ name, declares }) ?? name);

    // The selector of the declaration a module is named after goes on the module's entry, since
    // that declaration has no entry of its own: "agl-select" has to find Select.
    const ownSelector = new Map<number, string>();

    for (const [moduleIndex, name, , selector] of index.declarations) {
        if (name === titles[moduleIndex]) ownSelector.set(moduleIndex, selector);
    }

    index.modules.forEach(([name], i) => {
        entries.push({ ...entry('module', titles[i], `@anguless/angulux/${name}`, `/${name}`), also: `${name} ${ownSelector.get(i) ?? ''}`.trim().toLowerCase() });
    });

    index.declarations.forEach(([moduleIndex, name, kind, selector]) => {
        if (name === titles[moduleIndex]) return;

        const module = index.modules[moduleIndex][0];

        entries.push({ ...entry(kind === 'd' ? 'directive' : 'component', name, titles[moduleIndex], `/${module}`, `api-${name}`), also: selector.toLowerCase() });
    });

    for (const [declarationIndex, kind, name] of index.members) {
        const [moduleIndex, declaration] = index.declarations[declarationIndex];

        const where = declaration === titles[moduleIndex] ? declaration : `${declaration} · ${titles[moduleIndex]}`;

        entries.push(entry(MEMBER_KIND[kind], name, where, `/${index.modules[moduleIndex][0]}`, `api-${declaration}`));
    }

    return entries;
}

function entry(kind: EntryKind, label: string, context: string, path: string, fragment?: string): SearchEntry {
    return { kind, label, context, path, fragment, key: label.toLowerCase(), also: '' };
}

/**
 * The best matches for a query, at most `limit` of them.
 *
 * A whole-name match beats a name that starts with the query, which beats a name that contains
 * it; the entry-point name and the selector count a step lower than the name itself. An input,
 * output or slot counts one and a half steps lower than a page or a declaration: someone typing
 * "date" wants DatePicker before DatePicker's `date` slot, while an exact `showButtonBar` still
 * beats every page that merely contains the letters. Within one score, the kind decides
 * (KIND_ORDER), then the shorter name.
 */
export function search(entries: readonly SearchEntry[], query: string, limit = 50): SearchEntry[] {
    const q = query.trim().toLowerCase();

    if (!q) return [];

    const scored: [number, SearchEntry][] = [];

    for (const candidate of entries) {
        const score = scoreOf(candidate, q);

        if (score >= 0) scored.push([score + (KIND_ORDER[candidate.kind] >= KIND_ORDER.input ? 1.5 : 0), candidate]);
    }

    scored.sort(([sa, a], [sb, b]) => sa - sb || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.label.length - b.label.length || a.label.localeCompare(b.label));

    return scored.slice(0, limit).map(([, found]) => found);
}

function scoreOf(candidate: SearchEntry, q: string): number {
    if (candidate.key === q) return 0;
    if (candidate.key.startsWith(q)) return 1;
    if (candidate.also && (candidate.also === q || candidate.also.split(/[\s,]+/).some((word) => word.startsWith(q)))) return 2;
    if (candidate.key.includes(q)) return 3;
    if (candidate.also.includes(q)) return 4;

    return -1;
}
