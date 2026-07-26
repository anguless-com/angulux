import { NgModule } from '@angular/core';

/**
 * SharedModule once carried the three retired facet mechanisms: the `<agl-header>` and
 * `<agl-footer>` projection components, and the `[aglTemplate]` directive whose `getType()`
 * fed a per-component decorator query that switched on the slot name and wrote the result into
 * a shadow `_xTemplate` field.
 *
 * BL-35 replaced all three with one route per slot — `<ng-template #x>` read by
 * `contentChild('x')` — so the module now declares and exports nothing. Removing the three
 * classes is the closing condition of that migration, and `tools/check-facet-migration.mjs`
 * (INV-4) enforces it: it fails if they are deleted while any module still needs them, and
 * equally if they survive once none does.
 *
 * The module itself is deliberately kept. It is public API that consumers import, and dropping
 * an export is a breaking change that belongs to a major-version decision rather than to this
 * migration. Importing it is now a no-op.
 */
@NgModule({})
export class SharedModule {}
