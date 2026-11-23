/**
 * Counting fixed-duration waits in a spec file. Shared by check-spec-waits.mjs and its test.
 *
 * A fixed-duration wait is `new Promise((resolve) => setTimeout(resolve, N))` with N other than
 * a literal 0: the test sleeps for a stretch of time and then asserts. Nothing connects the
 * two, so the test passes on an idle machine and fails on a loaded one.
 *
 * Read from the TypeScript syntax tree, not with a pattern, because the shapes vary: `r` or
 * `resolve`, a `function` executor, `window.setTimeout`, a `() => resolve()` callback, a
 * duration that is an expression. What is NOT counted:
 *
 *   - `setTimeout(resolve, 0)` and `setTimeout(resolve)`. That yields one macrotask. It does
 *     not get longer under load, so it is not a bet on a duration.
 *   - a `setTimeout` that does work and is not the Promise's own resolver (a test host
 *     simulating late data). That is the thing a test waits for, not the wait.
 */
import ts from 'typescript';

const isZero = (node) => !node || (ts.isNumericLiteral(node) && Number(node.text) === 0);

function isTimerCall(node) {
    if (!ts.isCallExpression(node)) return false;
    const callee = node.expression;
    if (ts.isIdentifier(callee)) return callee.text === 'setTimeout';
    return ts.isPropertyAccessExpression(callee) && callee.name.text === 'setTimeout';
}

/** `resolve`, or a function whose whole body is `resolve()`. `resolve(value)` is late data, not a sleep. */
function resolves(node, name) {
    if (!node) return false;
    if (ts.isIdentifier(node)) return node.text === name;
    if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return false;
    let body = node.body;
    if (ts.isBlock(body)) {
        if (body.statements.length !== 1 || !ts.isExpressionStatement(body.statements[0])) return false;
        body = body.statements[0].expression;
    }
    return ts.isCallExpression(body) && ts.isIdentifier(body.expression) && body.expression.text === name && body.arguments.length === 0;
}

/** The `setTimeout` call an executor ends in, if the executor does nothing else. */
function onlyTimerCall(executor) {
    let body = executor.body;
    if (ts.isBlock(body)) {
        if (body.statements.length !== 1 || !ts.isExpressionStatement(body.statements[0])) return null;
        body = body.statements[0].expression;
    }
    return isTimerCall(body) ? body : null;
}

/**
 * @param {string} source  the text of one spec file
 * @param {string} [fileName]
 * @returns {{ line: number, text: string }[]}  one entry per fixed-duration wait
 */
export function findWaits(source, fileName = 'x.spec.ts') {
    const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
    const out = [];

    const visit = (node) => {
        if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Promise') {
            const executor = node.arguments?.[0];
            if (executor && (ts.isArrowFunction(executor) || ts.isFunctionExpression(executor))) {
                const first = executor.parameters[0]?.name;
                const call = onlyTimerCall(executor);
                if (first && ts.isIdentifier(first) && call && resolves(call.arguments[0], first.text) && !isZero(call.arguments[1])) {
                    out.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, text: node.getText(file) });
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    return out;
}

/** `{ over, under }`: files with more waits than their allowance, and files with fewer. */
export function compare(baseline, found) {
    const over = [];
    const under = [];
    for (const file of new Set([...Object.keys(baseline), ...Object.keys(found)])) {
        const allowed = baseline[file] ?? 0;
        const n = found[file] ?? 0;
        if (n > allowed) over.push({ file, found: n, allowed });
        if (n < allowed) under.push({ file, found: n, allowed });
    }
    const order = (a, b) => a.file.localeCompare(b.file);
    return { over: over.sort(order), under: under.sort(order) };
}

/** min(recorded, found) per file, dropping files that reach zero. It cannot add or raise. */
export function prune(baseline, found) {
    const out = {};
    for (const file of Object.keys(baseline).sort()) {
        const n = Math.min(baseline[file], found[file] ?? 0);
        if (n > 0) out[file] = n;
    }
    return out;
}
