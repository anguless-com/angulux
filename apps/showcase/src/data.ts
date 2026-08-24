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

// Cached per path: the nav and the page both want the index, and a reader clicking through
// modules should not re-download what has not changed between routes.
const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(path: string): Promise<T> {
    if (!cache.has(path)) {
        cache.set(
            path,
            fetch(path).then((response) => {
                if (!response.ok) {
                    throw new Error(`${path}: ${response.status}`);
                }

                return response.json();
            })
        );
    }

    return cache.get(path) as Promise<T>;
}

export const loadApiIndex = () => loadJson<ApiIndexEntry[]>('api/index.json');

export const loadApiModule = (name: string) => loadJson<ApiModule>(`api/${name}.json`);

export const loadDemos = () => loadJson<Record<string, Demo>>('demos.json');
