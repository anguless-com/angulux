import { Component, input } from '@angular/core';
import { ApiDeclaration } from '../data';
import { ScrollRegion } from './scroll-region';

/** A declaration to render, and the class it was inherited from when it is not the module's own. */
export interface ApiGroup {
    declaration: ApiDeclaration;
    inherited: boolean;
}

/**
 * The anchor a declaration is reachable at. Exported because the page builds the table of
 * contents from the same groups and the two have to agree — a link to `#foo` beside a heading
 * with a different id is a dead link that nothing would report.
 */
export function declarationAnchor(group: ApiGroup): string {
    return `api-${group.inherited ? 'inherited-' : ''}${group.declaration.name}`;
}

/**
 * The API reference, straight from the corpus. `check:corpus` already proves the corpus
 * matches the library, so this table inherits that guarantee instead of making its own claim.
 *
 * Two things it goes out of its way to show, because both were once missing and both left the
 * page describing an API that does not work:
 *
 *   • The name a caller WRITES, with the property name noted when the two differ. Binding to
 *     the property instead does nothing at all, and does it silently — an unknown attribute
 *     is not an error — so listing one of the pair sends a reader somewhere with no feedback.
 *   • Inherited members. `BaseInput` alone publishes ten inputs, so `min` and `max` are real
 *     on `agl-inputNumber` while appearing nowhere in its own tables. A reader who is not
 *     shown them concludes they do not exist.
 *
 * The tables are `table-fixed` with explicit column widths. Left to size themselves, browsers
 * give the room to the widest content — which in an API table is the type expression, so the
 * column carrying the least information eats the row and pushes Description off the viewport.
 * Fixed layout inverts that: the prose gets the space and types wrap.
 */
@Component({
    selector: 'agl-api-table',
    imports: [ScrollRegion],
    template: `
        @for (group of groups(); track group.declaration.name) {
            <section class="mt-10 scroll-mt-20" [id]="anchor(group)">
                @if (group.inherited) {
                    <div class="flex flex-wrap items-baseline gap-2.5">
                        <h3 class="text-base font-semibold text-muted">Inherited from {{ group.declaration.name }}</h3>
                        <span class="rounded-full border border-line px-2 text-[10px] uppercase tracking-wider text-faint">inherited</span>
                    </div>
                } @else {
                    <div class="flex flex-wrap items-baseline gap-2.5">
                        <h3 class="text-base font-semibold tracking-tight">{{ group.declaration.name }}</h3>
                        <span class="rounded-full border border-line px-2 text-[10px] uppercase tracking-wider text-faint">{{ group.declaration.kind }}</span>
                        @if (group.declaration.selector) {
                            <code class="font-mono text-[13px] text-brand">{{ group.declaration.selector }}</code>
                        }
                    </div>

                    @if (group.declaration.description) {
                        <p class="mt-1.5 text-sm text-muted">{{ group.declaration.description }}</p>
                    }
                }

                @if (group.declaration.inputs.length) {
                    <!-- Default is a fixed 7rem, enough for "documented" on a line of its own; as a
                         share of the table it was about 76px of text at 1440 wide and broke the word
                         into "documente / d". From a desktop down to a tablet the table fits its box.
                         Below sm it keeps 36rem and scrolls inside the box, which then joins the tab
                         order (aglScrollRegion): four columns in a phone's 370px do not fit in every
                         system font, and squeezed they broke every name inside the word. -->
                    <div class="thin-scroll mt-3 overflow-x-auto rounded-xl border border-line" [aglScrollRegion]="'Inputs of ' + group.declaration.name">
                        <table class="w-full table-fixed border-collapse text-[13px] max-sm:min-w-[36rem]">
                            <colgroup>
                                <col class="w-[22%]" />
                                <col class="w-[24%]" />
                                <col class="w-28" />
                                <col />
                            </colgroup>
                            <thead>
                                <tr class="bg-surface">
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Input</th>
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Type</th>
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Default</th>
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (member of group.declaration.inputs; track member.name) {
                                    <tr class="border-b border-line-soft last:border-0">
                                        <td class="px-3 py-2 align-top font-mono break-words">
                                            <span class="text-ink">@for (part of humps(member.name); track $index) {@if (!$first) {<wbr />}{{ part }}}</span>
                                            @if (member.field !== member.name) {
                                                <!-- Quieter than the published name on purpose: it is the one a reader must NOT write in a template. -->
                                                <div class="text-[11px] text-faint">property @for (part of humps(member.field); track $index) {@if (!$first) {<wbr />}{{ part }}}</div>
                                            }
                                            @if (member.deprecated) {
                                                <div class="font-sans text-[11px] text-caution">deprecated — {{ member.deprecated }}</div>
                                            }
                                        </td>
                                        <td class="px-3 py-2 align-top font-mono text-muted break-words">{{ member.type }}</td>
                                        <td class="px-3 py-2 align-top font-mono break-words">
                                            @if (member.defaultDeclared) {
                                                {{ member.default }}
                                            } @else {
                                                <!-- "Nobody wrote a default down" — said, rather than left as a blank cell
                                                     that reads as "there is no default". Only 127 of 1205 inputs declare
                                                     one, so this is the common case and it has to stay visible. -->
                                                <span class="font-sans italic text-faint break-normal">not documented</span>
                                            }
                                        </td>
                                        <!-- break-words: a description can carry one long name, such as
                                             DomSanitizer.bypassSecurityTrustHtml in pt's, and in a fixed table
                                             an unbreakable one overflows its cell and makes the box scroll. -->
                                        <td class="px-3 py-2 align-top text-muted break-words">{{ member.description }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }

                @if (group.declaration.outputs.length) {
                    <div class="thin-scroll mt-3 overflow-x-auto rounded-xl border border-line" [aglScrollRegion]="'Outputs of ' + group.declaration.name">
                        <table class="w-full table-fixed border-collapse text-[13px]">
                            <colgroup>
                                <col class="w-[22%]" />
                                <col class="w-[28%]" />
                                <col />
                            </colgroup>
                            <thead>
                                <tr class="bg-surface">
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Output</th>
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Type</th>
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (member of group.declaration.outputs; track member.name) {
                                    <tr class="border-b border-line-soft last:border-0">
                                        <td class="px-3 py-2 align-top font-mono break-words">
                                            <span class="text-ink">@for (part of humps(member.name); track $index) {@if (!$first) {<wbr />}{{ part }}}</span>
                                            @if (member.field !== member.name) {
                                                <div class="text-[11px] text-faint">property @for (part of humps(member.field); track $index) {@if (!$first) {<wbr />}{{ part }}}</div>
                                            }
                                        </td>
                                        <td class="px-3 py-2 align-top font-mono text-muted break-words">{{ member.type }}</td>
                                        <td class="px-3 py-2 align-top text-muted break-words">{{ member.description }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }

                @if (group.declaration.slots.length) {
                    <div class="thin-scroll mt-3 overflow-x-auto rounded-xl border border-line" [aglScrollRegion]="'Template slots of ' + group.declaration.name">
                        <table class="w-full table-fixed border-collapse text-[13px]">
                            <colgroup>
                                <col class="w-[30%]" />
                                <col />
                            </colgroup>
                            <thead>
                                <tr class="bg-surface">
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Template slot</th>
                                    <th class="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (slot of group.declaration.slots; track slot.name) {
                                    <tr class="border-b border-line-soft last:border-0">
                                        <td class="px-3 py-2 align-top font-mono break-words">&lt;ng-template #{{ slot.name }}&gt;</td>
                                        <td class="px-3 py-2 align-top text-muted">{{ slot.description }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }
            </section>
        }
    `
})
export class ApiTable {
    /**
     * Each of the module's own declarations, each followed by its inherited ancestors. The
     * page resolves the chain rather than this component, because only the page can fetch
     * another module's payload.
     */
    readonly groups = input.required<ApiGroup[]>();

    readonly anchor = declarationAnchor;

    /**
     * A member name cut where its words meet, for the template to put a `<wbr>` between the
     * pieces: `todayButtonStyleClass` → today · Button · Style · Class, `URLField` → URL · Field.
     *
     * The name column is a fifth of the table, and a long name used to break wherever the line
     * ran out: "todayButtonStyleCl / ass". A `<wbr>` is a place the line may break and nothing
     * else: it adds no character, so the name reads, copies and searches as one word. A single
     * piece longer than the column still breaks inside, through the cell's `break-words`.
     */
    humps(name: string): string[] {
        return name.split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/);
    }
}
