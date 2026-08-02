#!/usr/bin/env node
/**
 * check-language — the guard that keeps the public repo in English.
 *
 * angulux is developed in Vietnamese and published in English. Those two facts fight each
 * other on every commit, and the loser is always the same: a comment, a test name, a
 * console message that nobody notices because the build stays green. Once the repo is
 * public each of those is a paper cut in front of strangers — and test names are worse
 * than comments, because they land in the CI log where everyone reads them.
 *
 * TWO detectors, because Vietnamese hides in two different ways:
 *
 *   1. DIACRITICS — the easy half, though the split is not as clean as it looks. `ă đ ơ ư`
 *      and the hook/dot-below/horn variants are Vietnamese and nothing else. `â ê ô` are
 *      NOT: French, Portuguese and Turkish use them too. They are matched anyway, because
 *      dropping them would blind the guard to `không` and `một` — so this detector CAN
 *      fire on a foreign-language fixture, by design. Deliberately NOT matched: plain
 *      `à á è é ì í ò ó ù ú ã õ ç ñ ü ö`, which carry no Vietnamese signal; the inherited
 *      fixtures are full of them ("Case à cocher spéciale", "Drawer simülasyonu") and
 *      flagging those would train everyone to ignore this guard.
 *
 *   2. UNACCENTED VIETNAMESE — the half that actually escapes. Typing Vietnamese without
 *      diacritics is normal here (`pham vi khop, khong co ro ri`), and no diacritic
 *      regex will ever see it. So there is a second pass over a closed list of
 *      function words that are common in Vietnamese and are not English words. Function
 *      words, not content words: they appear in every Vietnamese sentence, so recall is
 *      high, and matching whole words only keeps false positives near zero.
 *
 *      That second detector ran for weeks at a recall it never measured. On 2026-08-02 a
 *      wide-net sweep found 18 unaccented lines across 10 tracked files that it had let
 *      through — every developer script in `tools/` had Vietnamese console output and
 *      comments in it. Two causes, both fixed here:
 *        • the word list was too short (`tong`, `muc`, `cach`, `thay` were simply absent);
 *        • requiring TWO listed words on one line dropped whole sentences that happened to
 *          contain only one, e.g. `Khong tim thay pnpm-workspace.yaml khi do nguoc tu …`.
 *      So the list is now two tiers. STRONG words fire on their own: grammar words whose
 *      spelling exists in no English word, no plausible code identifier, and no personal
 *      name. WEAK words keep the original two-distinct-hits rule, which is what makes it
 *      safe to include the near-misses. Deliberately NOT promoted to STRONG: `mot` and
 *      `moi` (ordinary French, and the inherited fixtures are French), `nhung`, `nhat`,
 *      `trinh`, `dieu`, `nguyen`, `huong` (common Vietnamese names — a contributor list
 *      would light the guard up), and `tim`, `sung`, `sang`, `con`, `ban`, `thu`, `se`,
 *      `da`, `de`, `vi` (plain English, the original draft's mistakes).
 *
 * Recall is no longer taken on faith: `tools/test/check-language.test.mjs` replays all 18
 * lines from that sweep and fails if any stops being caught.
 *
 * Usage:
 *   node tools/check-language.mjs            # check, exit 1 on any finding
 *   node tools/check-language.mjs --verbose  # print every location
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const VERBOSE = process.argv.includes('--verbose');

/** Characters that are Vietnamese and effectively not anything else. */
export const VN_CHARS = /[ăâđêôơưĂÂĐÊÔƠƯ]|[ạảấầẩẫậắằẳẵặẹẻếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỵỷỹ]|[ẠẢẤẦẨẪẬẮẰẲẴẶẸẺẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỴỶỸ]/;

/**
 * STRONG — one occurrence is already proof. Admission test, all three must hold:
 * the spelling is not an English word, not plausible as a code identifier or an
 * abbreviation, and not a Vietnamese personal name. These are grammar words, so they
 * carry no name risk and a single one of them cannot land in an English sentence.
 */
export const VN_WORDS_STRONG = [
    'khong', 'duoc', 'truoc', 'hoac', 'nhieu', 'khop', 'nguoi', 'buoc', 'luoc', 'khoang',
    'duoi', 'deu', 'nua', 'cung', 'cua', 'voi', 'neu', 'tong', 'muc', 'cach',
    'chua', 'phai', 'nguon', 'phien', 'khac', 'giai', 'trong', 'ngoai', 'thuoc'
];

/**
 * WEAK — two distinct hits on one line, the original rule.
 *
 * Two rules learned by getting this wrong first:
 *   • Every entry must fail as English. `them`, `thu`, `ban`, `se`, `da`, `de`, `vi` were
 *     all in the first draft and all fired on real English or real code — "not all of
 *     them", `['Sun','Mon','Tue','Wed','Thu',…]`, `pi pi-ban`, `cursor: se-resize`.
 *   • ONE hit is not evidence. Vietnamese prose puts several of these in every sentence,
 *     so requiring TWO DISTINCT hits on a line keeps recall high while dropping the
 *     accidental single-word collisions that make a guard get switched off.
 * The tier exists so that words failing only the second test — near-misses like `mot`
 * and `moi`, and names like `nhung` and `trinh` — still contribute recall without ever
 * being able to fail a build on their own.
 */
export const VN_WORDS_WEAK = [
    'nhung', 'roi', 'bang', 'tung', 'nhat', 'pham', 'thieu', 'kiem', 'chay', 'canh',
    'quyen', 'nhiem', 'chung', 'hien', 'kich', 'cong', 'viec', 'tep', 'thuc', 'hanh',
    'xoa', 'doan', 'luong', 'tuong', 'truong', 'trinh', 'muon', 'nghia', 'rieng',
    'chinh', 'diem', 'dieu', 'nham', 'vao', 'ra', 'tai',
    // added 2026-08-02 after the wide-net sweep — every one of these appeared in a real
    // Vietnamese line that the guard had been letting through
    'mot', 'moi', 'thay', 'dong', 'khai', 'bao', 'chuyen', 'thuong', 'duong', 'huong',
    'viet', 'giay', 'phep', 'trang', 'phan', 'tinh', 'khi', 'dau', 'sau', 'cho', 'xem',
    'sot', 'vua', 'loi', 'lop', 'hon', 'cao', 'nghe', 'tim',
    // `cac` was STRONG for one run and immediately fired on `cac@6.7.14` in pnpm-lock.yaml —
    // `cac` is a real npm package. It fails the "not plausible as an identifier" half of the
    // STRONG admission test, so it lives here. Dependency names are the lockfile's own facts.
    'cac',
    // second pass of the same sweep: translating the flagged lines exposed neighbours the
    // guard still could not see (`dong import bo sung`, `tham chieu con sot`, `Da sua … tren
    // … file`). Fixing only what the guard reports is how the hole got here in the first place.
    'chieu', 'tham', 'sua', 'tren', 'nguoc', 'goc', 'ghi', 'luu', 'hoan', 'doi', 'lieu',
    'thoi', 'tiep', 'toan', 'xuat', 'phuc'
];

const reOf = (words) => new RegExp(`\\b(?:${[...new Set(words)].join('|')})\\b`, 'gi');
const STRONG_RE = reOf(VN_WORDS_STRONG);
const WEAK_RE = reOf([...VN_WORDS_STRONG, ...VN_WORDS_WEAK]);

const distinct = (line, re) => [...new Set([...line.matchAll(re)].map((m) => m[0].toLowerCase()))];

/**
 * The whole decision for one line, in one place so the tests can drive it directly.
 * Returns null when the line is clean.
 */
export function classifyLine(line) {
    if (VN_CHARS.test(line)) return { kind: 'accented', hits: [] };
    const strong = distinct(line, STRONG_RE);
    if (strong.length >= 1) return { kind: 'unaccented', hits: strong };
    const all = distinct(line, WEAK_RE);
    if (all.length >= 2) return { kind: 'unaccented', hits: all };
    return null;
}

/**
 * Files exempt from BOTH detectors.
 * `attic/` is verbatim unported upstream code (see attic/README.md); NOTICE is exempt so
 * that third-party attribution text can stay in its own language (it needs no exemption
 * today — the allowance is deliberate headroom). Everything else is in scope, PROVENANCE.md
 * and every spec included.
 *
 * In-scope specs pass because none of them contain `â ê ô` — not because foreign fixtures
 * are unmatchable. attic/cascadeselect/cascadeselect.spec.ts carries "Côte d'Ivoire" and
 * would fail this gate the day it is ported into src/. When that day comes, translate or
 * re-letter the fixture. Do NOT drop `â ê ô` from VN_CHARS to make it pass: that is the
 * one edit that silently guts the detector.
 */
const EXEMPT = [
    /^packages\/angulux\/attic\//,
    /^\.agl\//,
    /^ref\//,
    /^NOTICE$/,
    // This file. A language guard necessarily contains the characters and words it forbids,
    // the same way a lint rule contains the pattern it bans. Self-exempt, not weakened.
    /^tools\/check-language\.mjs$/,
    // Its test, for the same reason and a stronger one: the regression corpus IS the
    // Vietnamese the guard must keep catching. Translating it would delete the evidence.
    /^tools\/test\/check-language\.test\.mjs$/
];

/** Binary-ish extensions never worth scanning. */
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.tgz', '.zip', '.lock']);

/** Every tracked file the guard is responsible for — exported so the test can assert scope. */
export function scannedFiles() {
    return execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
        .toString()
        .split('\0')
        .filter(Boolean)
        .filter((f) => !SKIP_EXT.has(extname(f).toLowerCase()))
        .filter((f) => !EXEMPT.some((re) => re.test(f)));
}

const report = (list, title, hint) => {
    if (!list.length) return;
    const byFile = {};
    for (const x of list) (byFile[x.f] ??= []).push(x);
    console.error(`\n${title} — ${list.length} line(s) across ${Object.keys(byFile).length} file(s)`);
    console.error(`  ${hint}\n`);
    const entries = Object.entries(byFile);
    for (const [f, items] of VERBOSE ? entries : entries.slice(0, 12)) {
        console.error(`  ${f}  (${items.length})`);
        for (const x of (VERBOSE ? items : items.slice(0, 2))) console.error(`      ${x.line}: ${x.text}`);
    }
    if (!VERBOSE && entries.length > 12) console.error(`  … and ${entries.length - 12} more file(s) (--verbose for all)`);
};

function main() {
    const files = scannedFiles();
    const accented = [];
    const unaccented = [];

    for (const f of files) {
        const p = join(root, f);
        if (!existsSync(p)) continue;
        let text;
        try {
            text = readFileSync(p, 'utf8');
        } catch {
            continue;
        }
        if (text.includes('\0')) continue; // binary

        text.split('\n').forEach((line, i) => {
            const verdict = classifyLine(line);
            if (!verdict) return;
            const where = { f, line: i + 1, text: line.trim().slice(0, 90), hit: verdict.hits.join(' ') };
            (verdict.kind === 'accented' ? accented : unaccented).push(where);
        });
    }

    if (!accented.length && !unaccented.length) {
        console.log(`✓ check-language: ${files.length} tracked files, no Vietnamese left.`);
        process.exit(0);
    }

    report(accented, '✗ VIETNAMESE (accented)', 'Translate to English. Inherited French fixtures are NOT matched here.');
    report(unaccented, '✗ VIETNAMESE (unaccented)', 'This group escapes every diacritic filter — which is why the detector exists.');
    console.error('');
    process.exit(1);
}

// Importing this module (the test does) must not run the scan or call process.exit.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
