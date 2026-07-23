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
 *   1. DIACRITICS — the easy half. Matching on the characters that exist in Vietnamese
 *      and (essentially) nowhere else is high precision: `ă â đ ê ô ơ ư` plus every
 *      hook/dot-below/horn variant. Deliberately NOT matched: plain `à á è é ì í ò ó ù ú
 *      ã õ ç ñ ü ö`, which are ordinary French, Spanish, Portuguese and German. The
 *      inherited spec fixtures are full of those ("Côte d'Ivoire", "Case à cocher
 *      spéciale") and flagging them would train everyone to ignore this guard.
 *
 *   2. UNACCENTED VIETNAMESE — the half that actually escapes. Typing Vietnamese without
 *      diacritics is normal here (`pham vi khop, khong co ro ri`), and no diacritic
 *      regex will ever see it. So there is a second pass over a small closed list of
 *      function words that are common in Vietnamese and are not English words. Function
 *      words, not content words: they appear in every Vietnamese sentence, so recall is
 *      high, and matching whole words only keeps false positives near zero.
 *
 * Usage:
 *   node tools/check-language.mjs            # check, exit 1 on any finding
 *   node tools/check-language.mjs --verbose  # print every location
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.cwd();
const VERBOSE = process.argv.includes('--verbose');

/** Characters that are Vietnamese and effectively not anything else. */
const VN_CHARS = /[ăâđêôơưĂÂĐÊÔƠƯ]|[ạảấầẩẫậắằẳẵặẹẻếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỵỷỹ]|[ẠẢẤẦẨẪẬẮẰẲẴẶẸẺẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỴỶỸ]/;

/**
 * Vietnamese words that are not English words, whole-word and case-insensitive.
 *
 * Two rules learned by getting this wrong first:
 *   • Every entry must fail as English. `them`, `thu`, `ban`, `se`, `da`, `de`, `vi` were
 *     all in the first draft and all fired on real English or real code — "not all of
 *     them", `['Sun','Mon','Tue','Wed','Thu',…]`, `pi pi-ban`, `cursor: se-resize`.
 *   • ONE hit is not evidence. Vietnamese prose puts several of these in every sentence,
 *     so requiring TWO DISTINCT hits on a line keeps recall high while dropping the
 *     accidental single-word collisions that make a guard get switched off.
 */
const VN_WORDS = [
    'khong', 'nhung', 'duoc', 'phai', 'ngoai', 'cua', 'voi', 'truoc', 'neu', 'roi',
    'chua', 'bang', 'tung', 'nhat', 'pham', 'khop', 'thieu', 'kiem', 'chay', 'canh',
    'nguon', 'phien', 'quyen', 'nhiem', 'chung', 'hien', 'kich', 'cong', 'viec', 'tep',
    'giai', 'thuc', 'hanh', 'xoa', 'doan', 'luong', 'tuong', 'truong', 'trinh', 'muon',
    'nghia', 'rieng', 'chinh', 'diem', 'dieu', 'hoac', 'nham', 'vao', 'ra', 'tai'
];
const VN_WORD_RE = new RegExp(`\\b(?:${[...new Set(VN_WORDS)].join('|')})\\b`, 'gi');
/** Two distinct words on one line — see the note above on why one is not enough. */
const vnWordHits = (line) => [...new Set([...line.matchAll(VN_WORD_RE)].map((m) => m[0].toLowerCase()))];

/**
 * Files exempt from BOTH detectors.
 * `attic/` is verbatim unported upstream code (see attic/README.md) and NOTICE/PROVENANCE
 * may legitimately carry non-English text. Everything else is in scope, including specs:
 * their fixtures are French, which detector 1 does not match anyway.
 */
const EXEMPT = [
    /^packages\/angulux\/attic\//,
    /^\.agl\//,
    /^ref\//,
    /^NOTICE$/,
    // This file. A language guard necessarily contains the characters and words it forbids,
    // the same way a lint rule contains the pattern it bans. Self-exempt, not weakened.
    /^tools\/check-language\.mjs$/
];

/** Binary-ish extensions never worth scanning. */
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.tgz', '.zip', '.lock']);

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
    .toString()
    .split('\0')
    .filter(Boolean)
    .filter((f) => !SKIP_EXT.has(extname(f).toLowerCase()))
    .filter((f) => !EXEMPT.some((re) => re.test(f)));

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
        if (VN_CHARS.test(line)) {
            accented.push({ f, line: i + 1, text: line.trim().slice(0, 90) });
            return;
        }
        const hits = vnWordHits(line);
        if (hits.length >= 2) unaccented.push({ f, line: i + 1, text: line.trim().slice(0, 90), hit: hits.join(' ') });
    });
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

if (!accented.length && !unaccented.length) {
    console.log(`✓ check-language: ${files.length} tracked files, no Vietnamese left.`);
    process.exit(0);
}

report(accented, '✗ VIETNAMESE (accented)', 'Translate to English. Inherited French fixtures are NOT matched here.');
report(unaccented, '✗ VIETNAMESE (unaccented)', 'This group escapes every diacritic filter — which is why the detector exists.');
console.error('');
process.exit(1);
