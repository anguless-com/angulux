import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { FilterService } from './filterservice';

/**
 * The first specs this service has ever had.
 *
 * It arrived with the fork and shipped in every release since, and the defect below survived
 * all of them: `notEquals` treated an absent filter as "exclude everything" while the other
 * fifteen guarded matchers treated it as "filter is off". A "Not equals" column filter left
 * empty blanked the table.
 *
 * The single-case test is the smaller half. The invariant test underneath it is the point: the
 * defect was a lone outlier in a family of sixteen, which is exactly the shape that a
 * per-matcher test suite written one matcher at a time would have reproduced rather than
 * caught. So the family is asserted as a family.
 */
describe('FilterService', () => {
    let service: FilterService;

    /** Every matcher that guards an absent filter, which is every matcher this service has. */
    const ALL_MATCHERS = [
        'startsWith',
        'contains',
        'notContains',
        'endsWith',
        'equals',
        'notEquals',
        'in',
        'between',
        'lt',
        'lte',
        'gt',
        'gte',
        'is',
        'isNot',
        'before',
        'after',
        'dateIs',
        'dateIsNot',
        'dateBefore',
        'dateAfter'
    ];

    /** The subset that also treats an empty STRING as absent. Numeric and date matchers do not. */
    const STRING_MATCHERS = ['startsWith', 'contains', 'notContains', 'endsWith', 'equals', 'notEquals'];

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), FilterService] });
        service = TestBed.inject(FilterService);
    });

    describe('an absent filter means the filter is off', () => {
        it('holds for every matcher, for null and undefined alike', () => {
            for (const name of ALL_MATCHERS) {
                for (const absent of [null, undefined]) {
                    expect(service.filters[name]('anything', absent))
                        .withContext(`${name} with ${String(absent)} must let the row through`)
                        .toBeTrue();
                }
            }
        });

        it('holds for the string matchers when the filter is blank or whitespace', () => {
            for (const name of STRING_MATCHERS) {
                for (const blank of ['', '   ']) {
                    expect(service.filters[name]('anything', blank))
                        .withContext(`${name} with ${JSON.stringify(blank)} must let the row through`)
                        .toBeTrue();
                }
            }
        });
    });

    describe('notEquals', () => {
        it('lets every row through when the filter is empty', () => {
            // The regression. This returned false, and `filter()` below returned zero rows.
            expect(service.filters.notEquals('alpha', null)).toBeTrue();
            expect(service.filters.notEquals('alpha', undefined)).toBeTrue();
            expect(service.filters.notEquals('alpha', '')).toBeTrue();
        });

        it('still excludes the rows that match, which is what it is for', () => {
            expect(service.filters.notEquals('alpha', 'alpha')).toBeFalse();
            expect(service.filters.notEquals('alpha', 'beta')).toBeTrue();
        });

        it('compares dates by instant, not by identity', () => {
            const at = new Date(2026, 0, 2, 3, 4, 5);
            expect(service.filters.notEquals(new Date(at.getTime()), at)).toBeFalse();
            expect(service.filters.notEquals(new Date(at.getTime() + 1000), at)).toBeTrue();
        });
    });

    describe('the two matchers that delegate to notEquals, and the one that does not', () => {
        it('isNot delegates, so it was affected and is fixed by the same line', () => {
            expect(service.filters.isNot('alpha', null)).toBeTrue();
            expect(service.filters.isNot('alpha', '')).toBeTrue();
            expect(service.filters.isNot('alpha', 'alpha')).toBeFalse();
        });

        it('dateIsNot carries its own guard and was never affected', () => {
            // Worth pinning: the first triage of this defect recorded that dateIsNot inherited
            // it. Reading the code showed it does not — it guards an absent filter itself and
            // only reaches notEquals for a filter that is present.
            const at = new Date(2026, 0, 2);
            expect(service.filters.dateIsNot(at, null)).toBeTrue();
            expect(service.filters.dateIsNot(at, new Date(2026, 0, 2))).toBeFalse();
            expect(service.filters.dateIsNot(at, new Date(2026, 0, 3))).toBeTrue();
        });
    });

    describe('filter() over a row set', () => {
        const rows = [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }];

        it('returns every row for an empty notEquals, and none of them before the fix', () => {
            for (const absent of [null, undefined, '']) {
                expect(service.filter(rows, ['name'], absent, 'notEquals').length)
                    .withContext(`notEquals with ${JSON.stringify(absent)}`)
                    .toBe(3);
            }
        });

        it('agrees with equals on an empty filter, which it did not before', () => {
            // The asymmetry was the whole tell: same row set, same empty filter, 0 rows versus 3.
            expect(service.filter(rows, ['name'], null, 'notEquals').length).toBe(service.filter(rows, ['name'], null, 'equals').length);
        });

        it('still filters when a filter is actually given', () => {
            expect(service.filter(rows, ['name'], 'alpha', 'notEquals').map((r) => r.name)).toEqual(['beta', 'gamma']);
        });
    });
});
