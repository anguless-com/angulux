/**
 * Reads the two generated payloads: the API sliced out of the corpus by `build-api.mjs`, and
 * the demo code extracted by `build-demos.mjs`. Nothing here derives anything — if a fact is
 * not in one of those files, the site does not know it.
 */

export interface ApiMember {
    /** What a caller writes in a template. */
    name: string;
    /** What the class calls it — the same as `name` unless the member is published under an alias. */
    field: string;
    type: string;
    description: string;
    group: string;
    default: string;
    /**
     * Whether a default was actually written down. Only 127 of 1205 inputs declare one, so the
     * common case is "nobody recorded it" — which is not the same as "there is no default", and
     * a blank cell says the second.
     */
    defaultDeclared: boolean;
    deprecated: string | null;
    signal?: boolean;
}

export interface ApiSlot {
    name: string;
    description?: string;
}

export interface ApiDeclaration {
    name: string;
    kind: string;
    selector: string;
    /** The base class whose inputs, outputs and slots this one also has. */
    extends: string | null;
    description: string;
    inputs: ApiMember[];
    outputs: ApiMember[];
    slots: ApiSlot[];
}

export interface ApiModule {
    name: string;
    entrypoint: string;
    description: string;
    /** What a reader imports. Empty when the module's exports are standalone, as `icons` is. */
    ngModules: string[];
    declarations: ApiDeclaration[];
}

export interface ApiIndexEntry {
    name: string;
    entrypoint: string;
    description: string;
    declarationCount: number;
    /** The classes this module declares — the lookup an `extends` name is resolved through. */
    declares: string[];
}

export interface Demo {
    module: string;
    template: string;
    source: string;
}

/** How a payload is fetched. One implementation per environment — see `useJsonReader`. */
export type JsonReader = (path: string) => Promise<unknown>;

const viaFetch: JsonReader = (path) =>
    fetch(path).then((response) => {
        if (!response.ok) {
            throw new Error(`${path}: ${response.status}`);
        }

        return response.json();
    });

let read: JsonReader = viaFetch;

/**
 * Replace how payloads are read. Prerendering is the only caller.
 *
 * `fetch('api/button.json')` resolves against the document's base URL, which exists in a
 * browser and does not exist while prerendering in Node: there is no origin, no server, and
 * nothing listening. Rather than teach the app about two worlds, the server entry hands it a
 * reader that goes to the generated files on disk — the same bytes the browser would have
 * downloaded, obtained the only way available where there is no network.
 */
export function useJsonReader(reader: JsonReader): void {
    read = reader;
    cache.clear();
}

// Cached per path: the nav and the page both want the index, and a reader clicking through
// modules should not re-download what has not changed between routes. During prerendering the
// same cache spans all 65 routes, so each payload is read from disk once.
const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(path: string): Promise<T> {
    if (!cache.has(path)) {
        cache.set(path, read(path));
    }

    return cache.get(path) as Promise<T>;
}

export interface LibraryVersion {
    /** The last released version, from the git tag. Null when tags were unavailable at build time. */
    released: string | null;
    /** Commits since that tag touching the published package — work documented here but not yet installable. */
    unreleased: number;
}

export const loadVersion = () => loadJson<LibraryVersion>('version.json');

export const loadApiIndex = () => loadJson<ApiIndexEntry[]>('api/index.json');

export const loadApiModule = (name: string) => loadJson<ApiModule>(`api/${name}.json`);

export const loadDemos = () => loadJson<Record<string, Demo>>('demos.json');
