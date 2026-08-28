export default function getCursorOffset(element: Element, prevText: string, nextText: string, currentText: string): { top: number | string; left: number | string } {
    if (element) {
        const style = getComputedStyle(element);
        const ghostDiv = document.createElement('div');

        ghostDiv.style.position = 'absolute';
        ghostDiv.style.top = '0px';
        ghostDiv.style.left = '0px';
        ghostDiv.style.visibility = 'hidden';
        ghostDiv.style.pointerEvents = 'none';
        ghostDiv.style.overflow = style.overflow;
        ghostDiv.style.width = style.width;
        ghostDiv.style.height = style.height;
        ghostDiv.style.padding = style.padding;
        ghostDiv.style.border = style.border;
        ghostDiv.style.overflowWrap = style.overflowWrap;
        ghostDiv.style.whiteSpace = style.whiteSpace;
        ghostDiv.style.lineHeight = style.lineHeight;
        // Text nodes and <br> elements, never innerHTML. Two reasons, and the second one is
        // not about security:
        //
        //   • prevText is caller-supplied — typically whatever the user has typed before the
        //     caret. This div is appended to document.body a few lines down, so assigning it
        //     as HTML RUNS it: an <img src=x onerror=…> fires. Nothing here needs markup.
        //
        //   • it was also measuring the wrong thing. A literal < in the text became the start
        //     of a tag rather than a character, so the caret offset this function exists to
        //     compute was wrong for exactly the input that made it dangerous.
        for (const [index, part] of prevText.split(/\r\n|\r|\n/).entries()) {
            if (index) ghostDiv.appendChild(document.createElement('br'));
            ghostDiv.appendChild(document.createTextNode(part));
        }

        const ghostSpan = document.createElement('span');

        ghostSpan.textContent = currentText;
        ghostDiv.appendChild(ghostSpan);

        const text = document.createTextNode(nextText);

        ghostDiv.appendChild(text);
        document.body.appendChild(ghostDiv);

        const { offsetLeft, offsetTop, clientHeight } = ghostSpan;

        document.body.removeChild(ghostDiv);

        return {
            left: Math.abs(offsetLeft - element.scrollLeft),
            top: Math.abs(offsetTop - element.scrollTop) + clientHeight
        };
    }

    return {
        top: 'auto',
        left: 'auto'
    };
}
