import { ApplicationRef, Component, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectLazyLoadEvent, SelectModule } from '@anguless/angulux/select';

/**
 * Select probe page: the Select entries of the PrimeNG 22.1.2 to 22.1.5 changelogs (#168).
 *
 * Same rules as upstream-22-1.ts. Each scene is written from OUR source and measured in the
 * browser; the only thing taken from upstream is the published sentence that a defect exists.
 * One scene per `?case=`.
 */
const CASE = new URLSearchParams(location.search).get('case') ?? '';

interface City {
    name: string | null;
    code: string;
    disabled?: boolean;
    label?: string;
}

const CITIES: City[] = [
    { name: 'Hanoi', code: 'HN' },
    { name: 'Da Nang', code: 'DN' },
    { name: 'Hue', code: 'HU' },
    { name: 'Ho Chi Minh City', code: 'HCM' }
];

/** Every value a control takes, with whether the Select that wrote it was still on the page. */
function track(control: FormControl, log: string[], alive: () => boolean): FormControl {
    control.valueChanges.subscribe((v) => log.push(`${alive() ? '' : 'AFTER-DESTROY '}${typeof v === 'object' && v ? JSON.stringify(v) : String(v)}`));
    return control;
}

@Component({
    selector: 'agl-verify-root',
    imports: [FormsModule, ReactiveFormsModule, SelectModule],
    template: `
        <h1>angulux — Select probes</h1>
        @switch (kase) {
            @case ('timers') {
                <section id="sec-timers">
                    @if (alive()) {
                        <agl-select inputId="timers-input" [options]="cities" optionLabel="name" [formControl]="timersCtl" [selectOnFocus]="true" [autoOptionFocus]="false" />
                    }
                </section>
            }
            @case ('null-label') {
                <section id="sec-null-label">
                    <agl-select inputId="nl-input" [options]="nullLabelCities" optionLabel="name" placeholder="type ahead" />
                    <agl-select inputId="nl-editable" [options]="nullLabelCities" optionLabel="name" [editable]="true" placeholder="editable" />
                </section>
            }
            @case ('editable-a11y') {
                <section id="sec-editable-a11y">
                    <label for="ea-input">City</label>
                    <agl-select inputId="ea-input" [options]="cities" optionLabel="name" [editable]="true" placeholder="Pick a city" [(ngModel)]="eaValue" />
                    <label for="ea-plain">Town</label>
                    <agl-select inputId="ea-plain" [options]="cities" optionLabel="name" placeholder="Pick a town" ariaLabel="Town" />
                </section>
            }
            @case ('empty-message') {
                <section id="sec-empty-message">
                    <agl-select inputId="em-input" [options]="[]" [filter]="true" emptyMessage="Nothing here" emptyFilterMessage="No match" placeholder="empty" />
                </section>
            }
            @case ('filter-label') {
                <section id="sec-filter-label">
                    <agl-select id="fl-plain" inputId="fl-plain-input" [options]="cities" optionLabel="name" [filter]="true" [(ngModel)]="flValue" />
                    <agl-select id="fl-template" inputId="fl-template-input" [options]="cities" optionLabel="name" [filter]="true" [(ngModel)]="flValue">
                        <ng-template #selectedItem let-city>
                            <span class="fl-selected">sel:{{ city?.name }}</span>
                        </ng-template>
                    </agl-select>
                    <agl-select id="fl-editable" inputId="fl-editable-input" [options]="cities" optionLabel="name" [filter]="true" [editable]="true" [(ngModel)]="flValue" />
                </section>
            }
            @case ('grouped') {
                <section id="sec-grouped">
                    <agl-select inputId="gr-grouped" [options]="groups" [group]="true" optionLabel="label" optionGroupLabel="label" optionGroupChildren="items" [filter]="true" placeholder="grouped" scrollHeight="300px" />
                    <agl-select inputId="gr-flat" [options]="flat" optionLabel="label" [filter]="true" placeholder="flat" scrollHeight="300px" />
                </section>
            }
            @case ('editable-values') {
                <section id="sec-editable-values">
                    <agl-select inputId="ev-object" [options]="cities" optionLabel="name" [editable]="true" [ngModel]="ghost" placeholder="object" />
                    <agl-select inputId="ev-empty" [options]="cities" optionLabel="name" [editable]="true" [ngModel]="''" placeholder="Empty string" />
                    <agl-select inputId="ev-null" [options]="cities" optionLabel="name" [editable]="true" [ngModel]="null" placeholder="Null value" />
                </section>
            }
            @case ('lazy-filter') {
                <section id="sec-lazy-filter">
                    <agl-select inputId="lf-input" [options]="lazyItems" optionLabel="label" [virtualScroll]="true" [virtualScrollItemSize]="38" [lazy]="true" [filter]="true" (onLazyLoad)="onLazy($event)" placeholder="lazy" />
                    <p id="lf-count">{{ lazyLoads().length }}</p>
                </section>
            }
            @case ('tab-parent') {
                <section id="sec-tab-parent">
                    <div id="tp-wrapper" (keydown)="onWrapperKey($event)">
                        <agl-select inputId="tp-input" [options]="cities" optionLabel="name" placeholder="tab" />
                        <button id="tp-after" type="button">after</button>
                    </div>
                    <p id="tp-count">{{ wrapperTabs() }}</p>
                </section>
            }
            @case ('label-click') {
                <section id="sec-label-click">
                    <label id="lc-label" for="lc-input">Pick a city</label>
                    <agl-select inputId="lc-input" [options]="cities" optionLabel="name" />
                    <label id="lcd-label" for="lcd-input">Disabled city</label>
                    <agl-select inputId="lcd-input" [options]="cities" optionLabel="name" [formControl]="disabledCtl" />
                    <p id="lcd-touched">{{ disabledTouched() }}</p>
                </section>
            }
            @case ('custom-filter') {
                <section id="sec-custom-filter">
                    <agl-select inputId="cf-select" [options]="cities" optionLabel="name" [filter]="true" filterBy="name">
                        <ng-template #filter let-options="options">
                            <input id="cf-input" (input)="options.filter($event)" placeholder="custom filter" />
                        </ng-template>
                    </agl-select>
                </section>
            }
            @case ('group-empty') {
                <section id="sec-group-empty">
                    <agl-select inputId="ge-input" [options]="groupsWithEmpty" [group]="true" optionLabel="label" optionGroupLabel="label" optionGroupChildren="items" [filter]="true" placeholder="groups" />
                </section>
            }
            @case ('editable-typing') {
                <section id="sec-editable-typing">
                    <agl-select inputId="et-input" [options]="cities" optionLabel="name" optionValue="name" [editable]="true" [formControl]="typingCtl" placeholder="type" />
                    <agl-select inputId="et-focus" [options]="cities" optionLabel="name" optionValue="name" [editable]="true" [selectOnFocus]="true" [formControl]="typingFocusCtl" placeholder="type, select on focus" />
                </section>
            }
            @case ('disabled-focus') {
                <section id="sec-disabled-focus">
                    <agl-select inputId="df-input" [options]="withDisabled" optionLabel="name" optionDisabled="disabled" [ngModel]="withDisabled[0]" placeholder="disabled first" [autoOptionFocus]="true" />
                </section>
            }
            @case ('structure') {
                <section id="sec-structure">
                    <agl-select inputId="st-input" [options]="cities" optionLabel="name" [filter]="true" placeholder="structure" />
                    <agl-select inputId="st-empty" [options]="[]" placeholder="no options" />
                    <agl-select inputId="st-template" [options]="cities" optionLabel="name" placeholder="templated">
                        <ng-template #item let-city>
                            <span class="st-item">{{ city.name }} ({{ city.code }})</span>
                        </ng-template>
                    </agl-select>
                </section>
            }
            @case ('readonly') {
                <section id="sec-readonly">
                    <agl-select inputId="ro-input" [options]="cities" optionLabel="name" [readonly]="true" [showClear]="true" [formControl]="readonlyCtl" />
                    <agl-select inputId="lo-input" [options]="cities" optionLabel="name" [loading]="true" [showClear]="true" [formControl]="loadingCtl" />
                </section>
            }
            @case ('required') {
                <section id="sec-required">
                    <form #f="ngForm">
                        <agl-select inputId="rq-input" name="city" [options]="cities" optionLabel="name" ngModel required />
                    </form>
                    <p id="rq-valid">{{ f.valid }}</p>
                </section>
            }
            @case ('option-label') {
                <section id="sec-option-label">
                    <agl-select id="ol-plain" inputId="ol-input" [options]="labelled" optionLabel="name" [filter]="true" [(ngModel)]="olValue" placeholder="option label" />
                    <agl-select id="ol-editable" inputId="ol-editable-input" [options]="labelled" optionLabel="name" [editable]="true" [(ngModel)]="olValue" />
                </section>
            }
            @case ('templates') {
                <section id="sec-templates">
                    <agl-select inputId="tt-all" [options]="groups.slice(0, 2)" [group]="true" optionLabel="label" optionGroupLabel="label" optionGroupChildren="items" [filter]="true" [showClear]="true" [ngModel]="groups[0].items[0]">
                        <ng-template #header><div class="tpl-header">header</div></ng-template>
                        <ng-template #footer><div class="tpl-footer">footer</div></ng-template>
                        <ng-template #item let-o><span class="tpl-item">{{ o.label }}</span></ng-template>
                        <ng-template #group let-g><span class="tpl-group">{{ g.label }}</span></ng-template>
                        <ng-template #selectedItem let-o><span class="tpl-selected">{{ o?.label }}</span></ng-template>
                        <ng-template #dropdownicon><span class="tpl-dropdownicon">v</span></ng-template>
                        <ng-template #clearicon><span class="tpl-clearicon">x</span></ng-template>
                        <ng-template #filtericon><span class="tpl-filtericon">f</span></ng-template>
                        <ng-template #emptyfilter><span class="tpl-emptyfilter">none matched</span></ng-template>
                    </agl-select>
                    <agl-select inputId="tt-loading" [options]="cities" optionLabel="name" [loading]="true">
                        <ng-template #loadingicon><span class="tpl-loadingicon">…</span></ng-template>
                    </agl-select>
                    <agl-select inputId="tt-empty" [options]="[]">
                        <ng-template #empty><span class="tpl-empty">empty list</span></ng-template>
                    </agl-select>
                    <agl-select inputId="tt-loader" [options]="lazyItems" optionLabel="label" [virtualScroll]="true" [virtualScrollItemSize]="38" [lazy]="true" [virtualScrollOptions]="{ showLoader: true, loading: true, delay: 0 }">
                        <ng-template #loader><div class="tpl-loader">loading row</div></ng-template>
                    </agl-select>
                </section>
            }
            @default {
                <p id="no-case">no case: {{ kase }}</p>
            }
        }
    `
})
export class UpstreamSelect {
    readonly kase = CASE;
    private readonly appRef = inject(ApplicationRef);

    cities = CITIES;
    nullLabelCities: City[] = [{ name: null, code: 'X' }, ...CITIES];
    labelled: City[] = CITIES.map((c) => ({ ...c, label: `label-${c.code}` }));
    withDisabled: City[] = [{ name: 'Closed', code: 'CL', disabled: true }, ...CITIES];
    ghost = { name: 'Ghost', code: 'GH' };

    groups = Array.from({ length: 100 }, (_, g) => ({ label: `Group ${g}`, items: Array.from({ length: 30 }, (_, i) => ({ label: `Item ${g}.${i}` })) }));
    flat = this.groups.flatMap((g) => g.items);
    groupsWithEmpty: { label: string; items?: { label: string }[] }[] = [{ label: 'Empty group' }, { label: 'North', items: [{ label: 'Hanoi' }, { label: 'Hai Phong' }] }];
    lazyItems = Array.from({ length: 1000 }, (_, i) => ({ label: `Lazy ${i}` }));

    alive = signal(true);
    log: string[] = [];
    timersCtl = track(new FormControl(null), this.log, () => this.alive());
    typingLog: string[] = [];
    typingCtl = track(new FormControl(null), this.typingLog, () => true);
    typingFocusLog: string[] = [];
    typingFocusCtl = track(new FormControl(null), this.typingFocusLog, () => true);
    disabledCtl = new FormControl({ value: null, disabled: true });
    disabledTouched = signal(false);
    readonlyCtl = new FormControl<City | null>(CITIES[0]);
    loadingCtl = new FormControl<City | null>(CITIES[1]);

    eaValue: City | null = null;
    flValue: City | null = CITIES[0];
    olValue: City | null = null;

    lazyLoads = signal<SelectLazyLoadEvent[]>([]);
    wrapperTabs = signal(0);

    constructor() {
        const w = window as unknown as Record<string, unknown>;
        w['__aglSelect'] = this;
        w['__aglDestroyTimers'] = () => {
            this.alive.set(false);
            this.appRef.tick();
        };
        this.disabledCtl.events.subscribe(() => this.disabledTouched.set(this.disabledCtl.touched));
    }

    onLazy(event: SelectLazyLoadEvent) {
        this.lazyLoads.update((list) => [...list, event]);
    }

    onWrapperKey(event: KeyboardEvent) {
        if (event.key === 'Tab') this.wrapperTabs.update((n) => n + 1);
    }
}
