/**
 * extract — read one source file's public Angular surface straight out of its syntax tree.
 *
 * WHY A SYNTAX WALK AND NOT A TYPE CHECKER. The corpus needs the type as an author WROTE it
 * ("'small' | 'large' | undefined"), not as a checker resolves it. A resolved type would be
 * both slower to produce and less useful to a reader, and a full Program would have to
 * resolve the whole library to answer a question the text already answers.
 *
 * WHY THE JSDOC IS PARSED BY HAND. `node.jsDoc` is a TypeScript internal. `getJSDocTags`
 * exists but returning the *description* through it wants a checker. `getLeadingCommentRanges`
 * is public, stable, and the JSDoc in this library is simple enough that a dozen lines beat
 * taking a dependency on an internal shape that can move in any minor release.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: guess. `iconPos` is initialised to 'left' in code and
 * declares no @defaultValue, so the extracted default is null with defaultDeclared:false.
 * Reporting 'left' would be manufacturing documentation the source never wrote — and the
 * whole point of the corpus is that a model can tell what we actually know.
 */

import ts from 'typescript';
import { readFileSync } from 'node:fs';

const DECLARATION_KIND = { Component: 'component', Directive: 'directive' };

const EMPTY_DOC = { description: '', group: null, default: null, defaultDeclared: false, deprecated: null };

function decoratorsOf(node) {
    return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

function decoratorName(decorator) {
    const expression = decorator.expression;
    const callee = ts.isCallExpression(expression) ? expression.expression : expression;
    return ts.isIdentifier(callee) ? callee.text : null;
}

function hasDecorator(node, name) {
    return decoratorsOf(node).some((d) => decoratorName(d) === name);
}

/** Pull `selector: 'agl-button'` out of the @Component/@Directive metadata object. */
function selectorOf(decorator, sourceFile) {
    const expression = decorator.expression;
    if (!ts.isCallExpression(expression) || expression.arguments.length === 0) return '';

    const metadata = expression.arguments[0];
    if (!ts.isObjectLiteralExpression(metadata)) return '';

    for (const property of metadata.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        if (property.name?.getText(sourceFile) !== 'selector') continue;
        if (ts.isStringLiteralLike(property.initializer)) return property.initializer.text;
    }
    return '';
}

/**
 * Parse a raw `/** ... *\/` block into a description plus the tags the corpus cares about.
 * Exported so its behaviour is testable without constructing a syntax tree.
 */
export function parseJsDoc(raw) {
    const lines = raw
        .replace(/^\/\*\*/, '')
        .replace(/\*\/$/, '')
        .split('\n')
        .map((line) => line.replace(/^\s*\*/, '').replace(/^ /, ''));

    const description = [];
    const tags = new Map();
    let current = null;

    for (const line of lines) {
        const match = /^@(\w+)\s*(.*)$/.exec(line.trim());
        if (match) {
            current = match[1];
            tags.set(current, [match[2]]);
            continue;
        }
        if (current) tags.get(current).push(line.trim());
        else description.push(line);
    }

    const tag = (name) => {
        const value = tags.get(name);
        if (value === undefined) return null;
        return value.join(' ').trim();
    };

    const defaultValue = tag('defaultValue');

    return {
        description: description.join('\n').trim(),
        group: tag('group'),
        default: defaultValue === null || defaultValue === '' ? null : defaultValue,
        defaultDeclared: defaultValue !== null,
        deprecated: tag('deprecated')
    };
}

function docFor(node, text) {
    const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
    const block = ranges.filter((range) => text.slice(range.pos, range.pos + 3) === '/**').pop();
    return block ? parseJsDoc(text.slice(block.pos, block.end)) : { ...EMPTY_DOC };
}

/** `x = input<T>()` / `input.required<T>()` / `output<T>()` — the signal-based style. */
function signalCall(node, names) {
    if (!ts.isPropertyDeclaration(node) || !node.initializer) return null;
    if (!ts.isCallExpression(node.initializer)) return null;

    const callee = node.initializer.expression;
    const root = ts.isPropertyAccessExpression(callee) ? callee.expression : callee;
    if (!ts.isIdentifier(root) || !names.includes(root.text)) return null;

    return node.initializer;
}

function typeTextOf(node, sourceFile, call) {
    if (node.type) return node.type.getText(sourceFile);
    if (call?.typeArguments?.length) return call.typeArguments[0].getText(sourceFile);
    return '';
}

/**
 * Extract every documentable declaration from one file.
 *
 * @param {string} filePath absolute path to a .ts file
 * @returns {Array<{name:string,kind:string,selector:string,description:string,inputs:Array,outputs:Array}>}
 */
export function extractFile(filePath) {
    // Normalise line endings at the door. Git checks this tree out as CRLF on Windows and LF
    // on the Linux runner, so a description carrying raw source newlines would serialise
    // differently on each — and T6's byte-identical drift gate would then fail forever on
    // whichever platform did not generate the committed file. The corpus is LF, everywhere.
    const text = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
    const declarations = [];

    for (const statement of sourceFile.statements) {
        if (!ts.isClassDeclaration(statement) || !statement.name) continue;

        const decorator = decoratorsOf(statement).find((d) => decoratorName(d) in DECLARATION_KIND);
        // An @NgModule is real Angular but not a documentable surface: it has no selector and
        // no inputs, and listing it would pad the corpus with entries a caller cannot use.
        if (!decorator) continue;

        const inputs = [];
        const outputs = [];

        for (const member of statement.members) {
            const isAccessorOrProperty =
                ts.isPropertyDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member);
            if (!isAccessorOrProperty || !member.name) continue;

            const name = member.name.getText(sourceFile);
            const doc = docFor(member, text);

            if (hasDecorator(member, 'Input')) {
                inputs.push({ name, type: typeTextOf(member, sourceFile), ...doc, signal: false });
                continue;
            }
            if (hasDecorator(member, 'Output')) {
                const { description, group, deprecated } = doc;
                outputs.push({ name, type: typeTextOf(member, sourceFile), description, group, deprecated, signal: false });
                continue;
            }

            const inputCall = signalCall(member, ['input']);
            if (inputCall) {
                inputs.push({ name, type: typeTextOf(member, sourceFile, inputCall), ...doc, signal: true });
                continue;
            }

            const outputCall = signalCall(member, ['output']);
            if (outputCall) {
                const { description, group, deprecated } = doc;
                outputs.push({
                    name,
                    type: typeTextOf(member, sourceFile, outputCall),
                    description,
                    group,
                    deprecated,
                    signal: true
                });
            }
        }

        declarations.push({
            name: statement.name.text,
            kind: DECLARATION_KIND[decoratorName(decorator)],
            selector: selectorOf(decorator, sourceFile),
            description: docFor(statement, text).description,
            inputs,
            outputs
        });
    }

    return declarations;
}
