import { getCursorOffset } from '@anguless/angulux-utils';

/**
 * `getCursorOffset` measures where the caret sits by building an invisible clone of the field
 * and asking the browser. Until 2026-08-29 it built that clone with
 *
 *     ghostDiv.innerHTML = prevText.replace(/\r\n|\r|\n/g, '<br />');
 *
 * and then attached it to `document.body`. `prevText` is whatever the user has typed before the
 * caret, so markup in it became live DOM — and the same bug made the measurement wrong, because
 * a literal `<` started a tag instead of occupying a column.
 *
 * These run in a real browser on purpose. A type checker cannot see the difference between text
 * and markup, and this is precisely a question about what the DOM did with the string.
 *
 * The helper below captures the clone at the moment it is attached: the function removes it
 * again before returning, so there is no other way to look inside it.
 */
describe('getCursorOffset', () => {
    let field: HTMLTextAreaElement;

    /** The ghost element `getCursorOffset` attaches, captured while it is on the page. */
    function ghostFor(prevText: string): HTMLElement {
        let captured: HTMLElement | null = null;
        const attach = document.body.appendChild.bind(document.body);

        spyOn(document.body, 'appendChild').and.callFake(((node: HTMLElement) => {
            captured = node;
            return attach(node);
        }) as any);

        getCursorOffset(field, prevText, '', '');

        if (!captured) throw new Error('getCursorOffset never attached its ghost element');
        return captured;
    }

    beforeEach(() => {
        field = document.createElement('textarea');
        document.body.appendChild(field);
    });

    afterEach(() => {
        field.remove();
    });

    it('does not turn typed markup into DOM', () => {
        const typed = '<img src=x onerror="window.__aglPwned = true">';

        const ghost = ghostFor(typed);

        expect(ghost.querySelector('img')).toBeNull();
        expect((window as any).__aglPwned).toBeUndefined();
        // The text is still measured — it is present as text, which is the whole point.
        expect(ghost.textContent).toContain(typed);
    });

    it('measures a literal < as a character rather than the start of a tag', () => {
        const typed = 'a < b';

        const ghost = ghostFor(typed);

        // Under the old implementation `< b` was parsed as markup and vanished from the text,
        // so the caret was measured against "a " and reported the wrong column.
        expect(ghost.textContent).toContain('a < b');
    });

    it('still breaks lines, so the measurement is unchanged for ordinary text', () => {
        const ghost = ghostFor('one\ntwo\r\nthree');

        expect(ghost.querySelectorAll('br').length).toBe(2);
        expect(ghost.textContent).toContain('one');
        expect(ghost.textContent).toContain('three');
    });

    it('returns a position rather than throwing', () => {
        const offset = getCursorOffset(field, 'hello', '', '');

        expect(typeof offset.top).toBeDefined();
        expect(typeof offset.left).toBeDefined();
    });
});
