import { isFocusableElement } from '@anguless/angulux-utils';
import { DomHandler, ɵgetFocusableElements } from './domhandler';

/*
 * A link is focusable. The selector for links used to read `[href][clientHeight][clientWidth]`:
 * `clientHeight` and `clientWidth` are DOM properties, never attributes, so that selector matched
 * no element at all and every caller skipped links — a dialog opened on the field after a link
 * instead of on the link, and isFocusableElement answered false for one.
 */
describe('focusable elements: links', () => {
    let root: HTMLElement;
    const ids = (elements: Element[]) => elements.map((element) => element.id);

    beforeEach(() => {
        root = document.createElement('div');
        document.body.appendChild(root);
    });

    afterEach(() => root.remove());

    it('ɵgetFocusableElements returns a link, in document order', () => {
        root.innerHTML = '<a id="help" href="#help">Help</a><input id="name" /><button id="save">Save</button>';
        expect(ids(ɵgetFocusableElements(root))).toEqual(['help', 'name', 'save']);
    });

    it('an anchor with no href is not focusable, and is not returned (control)', () => {
        root.innerHTML = '<a id="plain">Plain</a><input id="name" />';
        expect(ids(ɵgetFocusableElements(root))).toEqual(['name']);
    });

    it('a link taken out of the tab order, or hidden, is left out like any other element (control)', () => {
        root.innerHTML = '<a id="skipped" href="#a" tabindex="-1">A</a><a id="hidden" href="#b" hidden>B</a><input id="name" />';
        expect(ids(ɵgetFocusableElements(root))).toEqual(['name']);
    });

    it('DomHandler.isFocusableElement accepts a link and refuses an anchor with no href', () => {
        root.innerHTML = '<a id="link" href="#help">Help</a><a id="plain">Plain</a>';
        expect(DomHandler.isFocusableElement(root.querySelector('#link'))).toBe(true);
        expect(DomHandler.isFocusableElement(root.querySelector('#plain'))).toBe(false);
    });

    it('isFocusableElement from angulux-utils accepts a link and refuses an anchor with no href', () => {
        root.innerHTML = '<a id="link" href="#help">Help</a><a id="plain">Plain</a>';
        expect(isFocusableElement(root.querySelector('#link'))).toBe(true);
        expect(isFocusableElement(root.querySelector('#plain'))).toBe(false);
    });
});
