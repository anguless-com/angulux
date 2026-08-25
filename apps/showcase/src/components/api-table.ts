import { Component, input } from '@angular/core';
import { ApiDeclaration } from '../data';

/** A declaration to render, and the class it was inherited from when it is not the module's own. */
export interface ApiGroup {
    declaration: ApiDeclaration;
    inherited: boolean;
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
 */
@Component({
    selector: 'agl-api-table',
    standalone: true,
    template: `
        @for (group of groups(); track group.declaration.name) {
            <div class="decl">
                @if (group.inherited) {
                    <div class="decl-head">
                        <span class="decl-name">Inherited from {{ group.declaration.name }}</span>
                        <span class="kind">inherited</span>
                    </div>
                } @else {
                    <div class="decl-head">
                        <span class="decl-name">{{ group.declaration.name }}</span>
                        <span class="kind">{{ group.declaration.kind }}</span>
                        @if (group.declaration.selector) {
                            <span class="selector">{{ group.declaration.selector }}</span>
                        }
                    </div>

                    @if (group.declaration.description) {
                        <p class="section-text">{{ group.declaration.description }}</p>
                    }
                }

                @if (group.declaration.inputs.length) {
                    <div class="table-wrap">
                        <table class="t-inputs">
                            <colgroup>
                                <col />
                                <col />
                                <col />
                                <col />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Input</th>
                                    <th>Type</th>
                                    <th>Default</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (member of group.declaration.inputs; track member.name) {
                                    <tr>
                                        <td class="mono">
                                            {{ member.name }}
                                            @if (member.field !== member.name) {
                                                <div class="aliased">property {{ member.field }}</div>
                                            }
                                            @if (member.deprecated) {
                                                <div class="deprecated">deprecated — {{ member.deprecated }}</div>
                                            }
                                        </td>
                                        <td class="mono">{{ member.type }}</td>
                                        <td class="mono">
                                            @if (member.defaultDeclared) {
                                                {{ member.default }}
                                            } @else {
                                                <span class="undocumented">not documented</span>
                                            }
                                        </td>
                                        <td>{{ member.description }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }

                @if (group.declaration.outputs.length) {
                    <div class="table-wrap">
                        <table class="t-outputs">
                            <colgroup>
                                <col />
                                <col />
                                <col />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Output</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (member of group.declaration.outputs; track member.name) {
                                    <tr>
                                        <td class="mono">
                                            {{ member.name }}
                                            @if (member.field !== member.name) {
                                                <div class="aliased">property {{ member.field }}</div>
                                            }
                                        </td>
                                        <td class="mono">{{ member.type }}</td>
                                        <td>{{ member.description }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }

                @if (group.declaration.slots.length) {
                    <div class="table-wrap">
                        <table class="t-slots">
                            <colgroup>
                                <col />
                                <col />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Template slot</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (slot of group.declaration.slots; track slot.name) {
                                    <tr>
                                        <td class="mono">&lt;ng-template #{{ slot.name }}&gt;</td>
                                        <td>{{ slot.description }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }
            </div>
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
}
