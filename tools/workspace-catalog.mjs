/**
 * The pnpm-workspace.yaml reader, shared by every gate that needs to know what a
 * `catalog:` specifier actually resolves to.
 *
 * It was inlined in `check-catalog.mjs` until `check-peer-licence` needed the same answer.
 * Two parsers for one file is how the two gates would come to disagree about what version a
 * dependency is pinned at — which is the whole question both of them exist to ask.
 *
 * Minimal on purpose: just enough for the catalog shape, so no YAML dependency enters a
 * repository whose dependency surface IS its licence risk surface.
 */

/** Returns `{ packages: string[], catalog: {}, catalogs: { <name>: {} } }`. */
export function parseWorkspace(text) {
    const out = { packages: [], catalog: {}, catalogs: {} };
    let section = null;
    let subCatalog = null;

    for (const raw of text.split('\n')) {
        if (!raw.trim() || raw.trimStart().startsWith('#')) continue;

        const indent = raw.length - raw.trimStart().length;
        const line = raw.trim();

        if (indent === 0) {
            section = line.replace(/:$/, '');
            subCatalog = null;
            continue;
        }

        if (section === 'packages') {
            const m = line.match(/^-\s*['"]?(.+?)['"]?$/);

            if (m) out.packages.push(m[1]);
            continue;
        }

        if (section === 'catalog') {
            const m = line.match(/^['"]?([^'":]+)['"]?\s*:\s*['"]?([^'"]+)['"]?$/);

            if (m) out.catalog[m[1]] = m[2].trim();
            continue;
        }

        if (section === 'catalogs') {
            if (line.endsWith(':') && indent <= 4) {
                subCatalog = line.replace(/:$/, '');
                out.catalogs[subCatalog] = {};
                continue;
            }

            const m = line.match(/^['"]?([^'":]+)['"]?\s*:\s*['"]?([^'"]+)['"]?$/);

            if (m && subCatalog) out.catalogs[subCatalog][m[1]] = m[2].trim();
        }
    }

    return out;
}

/**
 * Resolve a specifier that may be `catalog:` or `catalog:<name>` to the version it names.
 * Returns null when it is not a catalog specifier, and undefined when it is one that the
 * workspace does not define — a distinction the caller has to keep, because "not a catalog
 * reference" is fine and "a catalog reference to nothing" is a defect.
 */
export function resolveCatalog(spec, dep, ws) {
    if (typeof spec !== 'string' || !spec.startsWith('catalog:')) return null;

    const name = spec.slice('catalog:'.length).trim();

    return name ? ws.catalogs[name]?.[dep] : ws.catalog[dep];
}
