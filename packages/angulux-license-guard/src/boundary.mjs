/**
 * The licence boundary — the legal record this package exists to carry.
 *
 * Sources: primeui.dev/nextchapter, cross-checked against the LICENSE file inside each
 * published npm tarball. Editing a value here changes a public claim about a third party's
 * licensing; the tests pin every entry so that a change is deliberate and visible in review.
 */

/**
 * The first version of each package that carries the commercial PrimeUI licence.
 * Any version >= the boundary is NOT MIT.
 */
export const FIRST_COMMERCIAL = {
    primeng: '22.0.0',
    primevue: '5.0.0',
    primereact: '11.0.0',
    primeicons: '8.0.0',
    '@primeuix/utils': '0.8.0',
    '@primeuix/styled': '1.0.0',
    '@primeuix/styles': '3.0.0',
    '@primeuix/themes': '3.0.0',
    '@primeuix/motion': '1.0.0'
};

/**
 * Packages this table treats as commercial at EVERY version.
 *
 * This entry used to read "no MIT release exists", and on 2026-08-26 that was checked and
 * found to be **false for one of the two**. The evidence is the LICENSE file read out of the
 * published tarballs, not the registry's `license` field:
 *
 *   • `@primeui/license-manager` — every version, prereleases included, points at a
 *     LICENSE.md that is the commercial PrimeUI licence. The old sentence held here.
 *   • `@primeicons/angular` — eleven prereleases, `8.0.0-alpha.1` (2026-02-06) through
 *     `8.0.0-beta.1` (2026-06-25), ship a **full MIT LICENSE** under PrimeTek's copyright.
 *     From `8.0.0-rc.1` (2026-06-28) onward, and at `8.0.0`, they do not.
 *
 * It stays in this list, and that is a decision rather than an oversight. Moving it to
 * FIRST_COMMERCIAL would make those eleven prereleases PASS a licence gate, for a package
 * angulux does not depend on and has no reason to — loosening a legal check to gain nothing.
 * Over-flagging fails closed; the cost is a false alarm nobody is positioned to trigger.
 *
 * What was not acceptable was the sentence. A legal record that states something demonstrably
 * untrue is worth less than one that admits the messy shape of the facts, and this project
 * has already paid once for a claim that was invented and then "confirmed" by a test written
 * to the same invention.
 */
export const ALWAYS_COMMERCIAL = ['@primeui/license-manager', '@primeicons/angular'];

/**
 * Prerelease tags that put a build under a separate licence, whatever its version number.
 *
 * `-lts` is PrimeNG's long-term-support line, and its builds are numbered inside the MIT range:
 * 77 of them on npm on 2026-11-17, from `13.4.2-lts` (2023-04-19) to `20.5.1-lts`
 * (2026-06-04), every one below the 22.0.0 boundary. Until 2026-11-17 the guard reported each
 * of them as MIT. `detect.mjs` strips the prerelease suffix before comparing, which is what
 * catches `22.0.0-rc.1`, and the same rule turned `20.5.1-lts` into `20.5.1`. PROVENANCE
 * section 3 already said the -lts line is proprietary. The guard did not.
 *
 * The evidence, read out of the tarballs on 2026-11-17, including the part that is messy:
 *
 *   • PrimeTek's own LICENSE.md in the MIT community releases (21.1.9 and 21.1.10 are
 *     byte-identical) has a section headed "PRIMENG LTS VERSIONS LICENSE (Versions with -lts
 *     suffix)": a licence identified by a unique key, with no right to distribute derivative
 *     works.
 *   • `20.5.1-lts`, the newest, ships that same LICENSE.md.
 *   • `13.4.2-lts`, the oldest, ships no LICENSE file at all, and its package.json says "MIT".
 *     It also carries `api/licensemanager`, the licence-key check.
 *
 * Only the oldest and the newest build were read; the 75 between them were not. Every -lts
 * build is treated as commercial. For `13.4.2-lts`, and any early build like it, that is a
 * decision, not a reading of its own files, and it is the same trade as ALWAYS_COMMERCIAL above. The
 * vendor's licence names the whole suffix, over-flagging fails closed, and the cost is a false
 * alarm on a build that no caret range resolves to. Only primeng published -lts builds on
 * 2026-11-17. The tag applies to every package in the table anyway, so another package's first
 * -lts build is not waved through by its number either.
 */
export const COMMERCIAL_TAGS = ['lts'];

/**
 * The date the table above was last checked against the published tarballs.
 *
 * No release cadence is promised. This date is what lets a reader judge the table's
 * freshness for themselves, and it is printed on every run for that reason. The safety net
 * that makes an out-of-date table survivable is `isPrimeTekPackage` below: anything this
 * table has never seen fails the build rather than passing it.
 *
 * WHAT THE 2026-08-26 CHECK ACTUALLY DID, so the next person knows what the date covers:
 * every boundary in FIRST_COMMERCIAL was re-read from the registry, confirming the version
 * exists, that it declares the commercial licence, and that the release below it does not.
 * Every value survived unchanged. Two things were learned that the table had not recorded:
 *
 *   1. PrimeTek flipped the licence at the `-rc.1` PRERELEASE of each package — 2026-06-28
 *      for most, 2026-07-02 for `@primeuix/utils` — and only then shipped the stable. The
 *      versions above are therefore the first STABLE commercial releases, which is why
 *      `detect.mjs` strips the prerelease suffix before comparing. That decision was made on
 *      reasoning; it is now backed by the dates.
 *   2. The registry's `license` field is useless for `primeng` and `primevue`, which have
 *      declared "SEE LICENSE IN LICENSE.md" since long before any of this. Their boundary
 *      rests on the LICENSE.md read by hand and on the archived tarballs, as PROVENANCE
 *      section 2 already says — not on metadata.
 *
 * WHAT THE 2026-11-17 CHECK DID. Every package in FIRST_COMMERCIAL was listed from the
 * registry with its publish dates. Each boundary version exists. Two releases published after
 * the 2026-06-28 flip sit BELOW their boundary: `primeng@21.1.10` (2026-09-09) and
 * `primereact@10.9.9` (2026-08-27). Their LICENSE files were read. The primeng one is
 * byte-identical to 21.1.9's (MIT for the community versions), and the primereact one is plain
 * MIT. Every boundary stands. The same listing found the -lts line, now recorded in
 * COMMERCIAL_TAGS above. The other unusual tags in it (`-patch`, `-watch`, `-SNAPSHOT`) are all
 * older than the flip and below their boundary.
 */
export const TABLE_VERIFIED = '2026-11-17';

/**
 * Does this package name belong to PrimeTek?
 *
 * This is the fail-closed hinge. A package that matches here but is absent from the tables
 * above is reported as unverifiable, NOT as clean — which is what stops a newly published
 * PrimeTek package from sliding through a table that predates it.
 *
 * Deliberately narrow: it matches the vendor's own namespaces, not everything containing the
 * substring "prime". `prettier`, `primer` and a local package called `prime-utils` are not
 * PrimeTek's and must not turn someone's build red.
 */
export function isPrimeTekPackage(name) {
    // Every unscoped name here was checked against the registry. `primeblock` was in this
    // list and is a 404 — invented while writing the matcher, then "confirmed" by a test
    // written to the same invention. Enumerate what exists; a broad /^prime/ would catch
    // GitHub's `primer` and any consumer's own `prime-*`.
    return (
        /^prime(ng|vue|react|icons|flex|faces)$/.test(name) ||
        name.startsWith('@primeuix/') ||
        name.startsWith('@primeui/') ||
        name.startsWith('@primeicons/')
    );
}
