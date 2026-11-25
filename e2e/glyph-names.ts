/**
 * Accessible names that carry an icon font's glyph.
 *
 * PrimeIcons draws each glyph in ::before as a private-use character (U+E000 to U+F8FF), and
 * generated content takes part in the accessible name. An icon that is not aria-hidden therefore
 * names its button "<glyph> Save" instead of "Save": a screen reader announces noise and a
 * voice-control user saying "Save" may not reach it.
 *
 * This reads the names in a Playwright ARIA snapshot, the quoted part of `- role "name"`, of every
 * role. Text a screen reader reads as content (after the colon) is not a name and is not checked.
 */
const PRIVATE_USE = /[-]/g;
const NAMED = /^\s*- ([\w-]+) "((?:[^"\\]|\\.)*)"/;

export function glyphNames(snapshot: string): string[] {
    const found: string[] = [];

    for (const line of snapshot.split('\n')) {
        const named = line.match(NAMED);

        if (named && named[2].match(PRIVATE_USE)) {
            found.push(`${named[1]} "${named[2].replace(PRIVATE_USE, (c) => `<U+${c.charCodeAt(0).toString(16).toUpperCase()}>`)}"`);
        }
    }

    return found;
}
