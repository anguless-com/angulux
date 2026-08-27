import { Component } from '@angular/core';
import { CheckIcon } from '@anguless/angulux/icons/check';
import { SearchIcon } from '@anguless/angulux/icons/search';
import { StarFillIcon } from '@anguless/angulux/icons/starfill';
import { TrashIcon } from '@anguless/angulux/icons/trash';

@Component({
    selector: 'agl-icons-basic-doc',
    imports: [CheckIcon, SearchIcon, StarFillIcon, TrashIcon],
    template: `
        <div class="card">
            <svg data-p-icon="check" style="width: 1.5rem; height: 1.5rem"></svg>
            <svg data-p-icon="search" style="width: 1.5rem; height: 1.5rem"></svg>
            <svg data-p-icon="trash" style="width: 1.5rem; height: 1.5rem"></svg>
            <svg data-p-icon="star-fill" style="width: 1.5rem; height: 1.5rem"></svg>
        </div>
    `
})
export class BasicDoc {}
