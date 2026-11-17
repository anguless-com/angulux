import { TestBed } from '@angular/core/testing';
import { style as datatableStyle } from '@anguless/angulux-styles/datatable';
import { TableStyle } from './tablestyle';

/**
 * The line above a selected row comes from a class Table sets, not from a sibling :has(), which made
 * rendering grow with the square of the rows (e2e/table-selected-edge.spec.ts holds the pixels).
 */
describe('TableStyle', () => {
    let css: string;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [TableStyle] });
        css = TestBed.inject(TableStyle).style as string;
    });

    it('carries no sibling :has() rule on body rows', () => {
        expect(css).not.toMatch(/tr:has\(\+\s*\.p-datatable-row-selected\)/);
    });

    it('draws the line above a selected row from p-datatable-row-before-selected, where the old rule stood', () => {
        expect(css).toContain(".p-datatable-tbody > tr.p-datatable-row-before-selected > td {\n        border-block-end-color: dt('datatable.body.cell.selected.border.color');");
        // Same place in the cascade: right before the rule for the selected row itself, as in the source.
        const replaced = css.indexOf('p-datatable-row-before-selected');
        const selectedRow = css.indexOf('.p-datatable-tbody > tr.p-datatable-row-selected > td');
        expect(replaced).toBeGreaterThan(-1);
        expect(selectedRow).toBeGreaterThan(replaced);
    });

    it('replaced the rule wherever the version of @anguless/angulux-styles in use still has it', () => {
        if (/tr:has\(\+\s*\.p-datatable-row-selected\)/.test(String(datatableStyle))) expect(css).toContain('p-datatable-row-before-selected');
        else expect(css).not.toContain('tr:has(+');
    });
});
