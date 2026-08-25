import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Which routes are prerendered, and what `:module` stands for.
 *
 * `getPrerenderParams` is not optional here and Angular says so plainly: a prerendered route
 * with a parameter and no way to enumerate it fails the build rather than quietly skipping
 * the 64 pages it cannot name.
 *
 * The names come from the generated `api/index.json`, which is sliced out of the committed
 * corpus — the same source the nav and every API table read. A hand-kept list is how a module
 * ends up in the corpus, in the nav, and served as an empty shell that only fills in once a
 * bundle has run: the one page whose content a search engine would never see.
 */
export const serverRoutes: ServerRoute[] = [
    {
        path: '',
        renderMode: RenderMode.Prerender
    },
    {
        path: ':module',
        renderMode: RenderMode.Prerender,
        async getPrerenderParams() {
            const { readFile } = await import('node:fs/promises');
            const { join } = await import('node:path');

            const index = JSON.parse(await readFile(join(process.cwd(), 'public/api/index.json'), 'utf8')) as { name: string }[];

            return index.map((entry) => ({ module: entry.name }));
        }
    }
];
