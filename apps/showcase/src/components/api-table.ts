import { Component, input } from '@angular/core';
import { ApiDeclaration } from '../data';

/**
 * The API reference, straight from the corpus. `check:corpus` already proves the corpus
 * matches the library, so this table inherits that guarantee instead of making its own claim.
 */
@Component({
    selector: 'agl-api-table',
    standalone: true,
    template: `
        @for (declaration of declarations(); track declaration.name) {
            <div class="decl">
                <div class="decl-head">
                    <span class="decl-name">{{ declaration.name }}</span>
                    <span class="kind">{{ declaration.kind }}</span>
                    @if (declaration.selector) {
                        <span class="selector">{{ declaration.selector }}</span>
                    }
                </div>

                @if (declaration.description) {
                    <p class="section-text">{{ declaration.description }}</p>
                }

                @if (declaration.inputs.length) {
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
                                @for (member of declaration.inputs; track member.name) {
                                    <tr>
                                        <td class="mono">
                                            {{ member.name }}
                                            @if (member.deprecated) {
                                                <div class="deprecated">deprecated — {{ member.deprecated }}</div>
                                            }
                                        </td>
                                        <td class="mono">{{ member.type }}</td>
                                        <td class="mono">{{ member.default }}</td>
                                        <td>{{ member.description }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }

                @if (declaration.outputs.length) {
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
                                @for (member of declaration.outputs; track member.name) {
                                    <tr>
                                        <td class="mono">{{ member.name }}</td>
                                        <td class="mono">{{ member.type }}</td>
                                        <td>{{ member.description }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }

                @if (declaration.slots.length) {
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
                                @for (slot of declaration.slots; track slot.name) {
                                    <tr>
                                        <td class="mono">{{ slot.name }}</td>
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
    readonly declarations = input.required<ApiDeclaration[]>();
}
