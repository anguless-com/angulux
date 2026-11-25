import { Component, Service, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { GuidePayload } from '../data';
import { CodeLines } from './code-lines';

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const STORAGE_KEY = 'agl-package-manager';

/**
 * The package manager a reader picked, shared by every install command on the site and kept
 * for their next visit.
 *
 * Read from storage after the first render, never during it. The server renders pnpm, and a
 * browser that started from a different value would not match the prerendered page it is
 * taking over. The command is one line in every package manager, so the swap moves nothing.
 */
@Service()
export class PackageManagerChoice {
    readonly current = signal<PackageManager>('pnpm');

    constructor() {
        afterNextRender(() => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);

                if ((PACKAGE_MANAGERS as readonly string[]).includes(stored ?? '')) this.current.set(stored as PackageManager);
            } catch {
                // Storage refused (a private window, blocked site data): pnpm stays.
            }
        });
    }

    choose(manager: PackageManager): void {
        this.current.set(manager);

        try {
            localStorage.setItem(STORAGE_KEY, manager);
        } catch {
            // Remembered for this page view only.
        }
    }
}

/**
 * The install command, with a switch between package managers. The commands come from
 * `guide-snippets.mjs`, where they share one list of packages.
 *
 * The switch is a row of toggle buttons with `aria-pressed`, not a tab list: what changes is one
 * line of text in place, not a panel, and a pressed state is what a screen reader needs to say
 * which command is shown.
 */
@Component({
    selector: 'agl-install-command',
    imports: [CodeLines],
    template: `
        <div class="overflow-hidden rounded-xl border border-line bg-sunken">
            <div class="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5" role="group" aria-label="Package manager">
                @for (manager of managers; track manager) {
                    <button
                        type="button"
                        class="rounded-md px-2.5 py-1 font-mono text-xs"
                        [class]="choice.current() === manager ? 'bg-canvas text-ink shadow-sm' : 'text-muted hover:text-ink'"
                        [attr.aria-pressed]="choice.current() === manager"
                        (click)="choice.choose(manager)"
                    >
                        {{ manager }}
                    </button>
                }
                <button type="button" class="ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted hover:text-ink" (click)="copy()">
                    <i class="pi text-[11px]" [class.pi-copy]="!copied()" [class.pi-check]="copied()"></i>
                    {{ copied() ? 'Copied' : 'Copy' }}
                </button>
            </div>

            <agl-code-lines [lines]="lines()" [palette]="guide()?.palette ?? []" />
        </div>
    `
})
export class InstallCommand {
    readonly guide = input.required<GuidePayload | null>();

    readonly choice = inject(PackageManagerChoice);

    readonly managers = PACKAGE_MANAGERS;

    readonly copied = signal(false);

    readonly lines = computed(() => this.guide()?.snippets[`install-${this.choice.current()}`] ?? []);

    copy(): void {
        const text = this.lines()
            .map((line) => line.map((token) => token.t).join(''))
            .join('\n');

        navigator.clipboard?.writeText(text).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 1500);
        });
    }
}
