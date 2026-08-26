import { Injectable } from '@angular/core';
import { equals, removeAccents, resolveFieldData } from '@anguless/angulux-utils';

@Injectable({ providedIn: 'root' })
export class FilterService {
    filter(value: any[], fields: any[], filterValue: any, filterMatchMode: string, filterLocale?: string) {
        let filteredItems: any[] = [];

        if (value) {
            for (let item of value) {
                for (let field of fields) {
                    let fieldValue = resolveFieldData(item, field);

                    if (this.filters[filterMatchMode](fieldValue, filterValue, filterLocale)) {
                        filteredItems.push(item);
                        break;
                    }
                }
            }
        }

        return filteredItems;
    }

    public filters: { [rule: string]: Function } = {
        startsWith: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null || filter.trim() === '') {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            let filterValue = removeAccents(filter.toString()).toLocaleLowerCase(filterLocale);
            let stringValue = removeAccents(value.toString()).toLocaleLowerCase(filterLocale);

            return stringValue.slice(0, filterValue.length) === filterValue;
        },

        contains: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null || (typeof filter === 'string' && filter.trim() === '')) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            let filterValue = removeAccents(filter.toString()).toLocaleLowerCase(filterLocale);
            let stringValue = removeAccents(value.toString()).toLocaleLowerCase(filterLocale);

            return stringValue.indexOf(filterValue) !== -1;
        },

        notContains: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null || (typeof filter === 'string' && filter.trim() === '')) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            let filterValue = removeAccents(filter.toString()).toLocaleLowerCase(filterLocale);
            let stringValue = removeAccents(value.toString()).toLocaleLowerCase(filterLocale);

            return stringValue.indexOf(filterValue) === -1;
        },

        endsWith: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null || filter.trim() === '') {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            let filterValue = removeAccents(filter.toString()).toLocaleLowerCase(filterLocale);
            let stringValue = removeAccents(value.toString()).toLocaleLowerCase(filterLocale);

            return stringValue.indexOf(filterValue, stringValue.length - filterValue.length) !== -1;
        },

        equals: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null || (typeof filter === 'string' && filter.trim() === '')) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            if (value.getTime && filter.getTime) return value.getTime() === filter.getTime();
            else if (value == filter) return true;
            else return removeAccents(value.toString()).toLocaleLowerCase(filterLocale) == removeAccents(filter.toString()).toLocaleLowerCase(filterLocale);
        },

        notEquals: (value: any, filter: any, filterLocale?: any): boolean => {
            // An absent filter is an INACTIVE filter, so every row passes it. This returned
            // `false` — the one matcher out of sixteen that did — and a "Not equals" column
            // filter left empty therefore excluded every row and blanked the table. It is
            // reachable without touching the service: `executeLocalFilter` applies a
            // constraint without checking whether its value is blank, and `agl-columnFilter`
            // registers constraints with `value: null`.
            //
            // Read as a design choice, `false` cannot be defended: `equals`, `contains`,
            // `notContains`, `startsWith`, `endsWith`, `in`, `between`, `lt`/`lte`/`gt`/`gte`,
            // `dateIs`, `dateIsNot`, `dateBefore` and `dateAfter` all return `true` here.
            // `dateIsNot` is the telling one — the same negation, guarded correctly a hundred
            // lines below. This was a typo with a long life, not a semantic.
            //
            // `isNot` delegates here and is fixed by the same line. `dateIsNot` does not: it
            // carries its own guard and was never affected.
            if (filter === undefined || filter === null || (typeof filter === 'string' && filter.trim() === '')) {
                return true;
            }

            if (value === undefined || value === null) {
                return true;
            }

            if (value.getTime && filter.getTime) return value.getTime() !== filter.getTime();
            else if (value == filter) return false;
            else return removeAccents(value.toString()).toLocaleLowerCase(filterLocale) != removeAccents(filter.toString()).toLocaleLowerCase(filterLocale);
        },

        in: (value: any, filter: any[]): boolean => {
            if (filter === undefined || filter === null || filter.length === 0) {
                return true;
            }

            for (let i = 0; i < filter.length; i++) {
                if (equals(value, filter[i])) {
                    return true;
                }
            }

            return false;
        },

        between: (value: any, filter: any[]): boolean => {
            if (filter == null || filter[0] == null || filter[1] == null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            if (value.getTime) return filter[0].getTime() <= value.getTime() && value.getTime() <= filter[1].getTime();
            else return filter[0] <= value && value <= filter[1];
        },

        lt: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            if (value.getTime && filter.getTime) return value.getTime() < filter.getTime();
            else return value < filter;
        },

        lte: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            if (value.getTime && filter.getTime) return value.getTime() <= filter.getTime();
            else return value <= filter;
        },

        gt: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            if (value.getTime && filter.getTime) return value.getTime() > filter.getTime();
            else return value > filter;
        },

        gte: (value: any, filter: any, filterLocale?: any): boolean => {
            if (filter === undefined || filter === null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            if (value.getTime && filter.getTime) return value.getTime() >= filter.getTime();
            else return value >= filter;
        },

        is: (value: any, filter: any, filterLocale?: any): boolean => {
            return this.filters.equals(value, filter, filterLocale);
        },

        isNot: (value: any, filter: any, filterLocale?: any): boolean => {
            return this.filters.notEquals(value, filter, filterLocale);
        },

        before: (value: any, filter: any, filterLocale?: any): boolean => {
            return this.filters.lt(value, filter, filterLocale);
        },

        after: (value: any, filter: any, filterLocale?: any): boolean => {
            return this.filters.gt(value, filter, filterLocale);
        },

        dateIs: (value: any, filter: any): boolean => {
            if (filter === undefined || filter === null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            return value.toDateString() === filter.toDateString();
        },

        dateIsNot: (value: any, filter: any): boolean => {
            if (filter === undefined || filter === null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            return value.toDateString() !== filter.toDateString();
        },

        dateBefore: (value: any, filter: any): boolean => {
            if (filter === undefined || filter === null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }

            return value.getTime() < filter.getTime();
        },

        dateAfter: (value: any, filter: any): boolean => {
            if (filter === undefined || filter === null) {
                return true;
            }

            if (value === undefined || value === null) {
                return false;
            }
            value.setHours(0, 0, 0, 0);

            return value.getTime() > filter.getTime();
        }
    };

    register(rule: string, fn: Function) {
        this.filters[rule] = fn;
    }
}
