/**
 * source — the single address the upstream watch is allowed to reach, and the wall around it.
 *
 * This is one line of logic in its own file on purpose. It is the mechanical form of
 * Constitution P1: angulux may read what PrimeTek PUBLISHES ABOUT `primeng@22` and may never
 * read `primeng@22`. A changelog sentence is a fact; a commit, a diff, a `.d.ts` or a tarball
 * is expression, and the difference is the difference between a lawful fork and a copy.
 *
 * A comment saying "we only fetch the changelog" is a promise. A function that throws on any
 * other URL is a proof, and it can be tested — `tools/test/upstream-watch.test.mjs` calls it
 * with a source URL and a `fetch` that explodes on contact, so the test fails if the refusal
 * ever stops happening BEFORE the request.
 *
 * Usage: import { ALLOWED, fetchChangelog } from './source.mjs'
 */

/** The whole reach of the upstream watch. */
export const ALLOWED = 'https://primeng.dev/changelog';

/**
 * @param {string} url must be exactly {@link ALLOWED}
 * @param {typeof fetch} fetchImpl injected so the refusal can be tested without a network
 * @returns {Promise<string>} the page HTML
 */
export async function fetchChangelog(url = ALLOWED, fetchImpl = fetch) {
    if (url !== ALLOWED) {
        throw new Error(`upstream-watch: refusing to fetch ${url}. This tool reads ${ALLOWED} and nothing else — Constitution P1 forbids reading PrimeTek material at the code level from primeng@22 onward.`);
    }
    const res = await fetchImpl(url, {
        headers: { 'user-agent': 'angulux-upstream-watch (+https://github.com/anguless-com/angulux)' }
    });
    if (!res.ok) throw new Error(`upstream-watch: HTTP ${res.status} from ${url}`);
    return res.text();
}
