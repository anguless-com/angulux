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

/** Packages that are commercial in every version — no MIT release exists. */
export const ALWAYS_COMMERCIAL = ['@primeui/license-manager', '@primeicons/angular'];

/**
 * The date the table above was last checked against the published tarballs.
 *
 * No release cadence is promised. This date is what lets a reader judge the table's
 * freshness for themselves, and it is printed on every run for that reason. The safety net
 * that makes an out-of-date table survivable is `isPrimeTekPackage` below: anything this
 * table has never seen fails the build rather than passing it.
 */
export const TABLE_VERIFIED = '2026-07-23';

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
    return (
        /^prime(ng|vue|react|icons|flex|block)$/.test(name) ||
        name.startsWith('@primeuix/') ||
        name.startsWith('@primeui/') ||
        name.startsWith('@primeicons/')
    );
}
