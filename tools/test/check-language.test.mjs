import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyLine, scannedFiles, VN_CHARS, VN_WORDS_STRONG, VN_WORDS_WEAK } from '../check-language.mjs';

/**
 * The first tests this guard has ever had.
 *
 * check-language shipped with two detectors and a confident docstring, and nobody ever
 * measured what the unaccented one actually caught. On 2026-08-02 a wide-net sweep found
 * 24 Vietnamese lines sitting in 10 tracked files of a PUBLIC repo — every codemod script
 * narrated its work in Vietnamese, and the guard had been green over all of it for weeks.
 *
 * The lesson is not "add more words". It is that a guard nobody tests reports its own
 * coverage, and a guard reporting its own coverage is a guard you cannot use as evidence.
 * So the corpus below is the real thing: the exact lines from that sweep, verbatim. If a
 * future edit to the word lists stops catching one of them, that edit fails here.
 *
 * This file is exempt from the guard it tests — see EXEMPT in check-language.mjs. The
 * Vietnamese here IS the evidence; translating it would delete what the test is for.
 */

/** The 24 lines the guard let through, verbatim, grouped by the file they came from. */
const ESCAPED_2026_08_02 = [
    ['apps/verify/src/app.ts', '<!-- ── 7. facet: canh lop loi <ng-content select="…"> vua va ───── -->'],
    ['provenance/manifest.json', '"note": "Moi ban cao hon cac version duoi day deu da chuyen sang giay phep thuong mai PrimeUI.",'],
    ['tools/build/build-helper.mjs', 'throw new Error(`Khong tim thay pnpm-workspace.yaml khi do nguoc tu ${from}`);'],
    ['tools/check-facet-single-route.mjs', "console.error('  decision-facet-api-mot-cach-duy-nhat-ng-template.\\n');"],
    ['tools/codemod/change-detection.mjs', 'console.log(`  file duoc sua      : ${touchedFiles}`);'],
    ['tools/codemod/change-detection.mjs', 'console.log(`  them Eager  (ngoai icons/): ${added.Eager}`);'],
    ['tools/codemod/change-detection.mjs', 'console.log(`  them OnPush (trong icons/): ${added.OnPush}`);'],
    ['tools/codemod/change-detection.mjs', 'console.log(`  theo module (ngoai icons/):`);'],
    ['tools/codemod/change-detection.mjs', "if (DRY) console.log('  (--dry: khong ghi gi)');"],
    ['tools/codemod/find-half-renames.mjs', 'console.log(`  Tim thay ${findings.length} cho doi NUA VOI, tren ${n} file`);'],
    ['tools/codemod/find-half-renames.mjs', 'if (findings.length > 15) console.log(`    ... va ${findings.length - 15} cho nua`);'],
    ['tools/codemod/rename.mjs', '// Duong dan co the NHIEU DOAN: primeng/types/button, primeng/icons/baseicon,'],
    ['tools/codemod/rename.mjs', '// --- 2. khai bao selector trong decorator ---'],
    ['tools/codemod/rename.mjs', '// --- 3. the phan tu trong template ---'],
    ['tools/codemod/rename.mjs', '// --- 4. thuoc tinh directive trong template ---'],
    ['tools/codemod/rename.mjs', "// Chi thay khi dung nhu THUOC TINH: dung sau khoang trang / dau [ / dau (,"],
    ['tools/codemod/rename.mjs', "// va theo sau la '=', ']', ')', khoang trang, '/' hoac '>'."],
    ['tools/codemod/rename.mjs', 'continue; // file moi, khong co ban goc de so'],
    ['tools/codemod/rename.mjs', "if (DRY) console.log('  (--dry: khong ghi gi)');"],
    ['tools/codemod/spec-change-detection.mjs', 'console.log(`  file spec duoc sua : ${touchedFiles} / ${files.length}`);'],
    ['tools/codemod/spec-change-detection.mjs', "if (DRY) console.log('  (--dry: khong ghi gi)');"],
    ['tools/provenance/archive-mit.mjs', "license: md.license ?? '(xem LICENSE trong tarball)',"],
    ['tools/provenance/archive-mit.mjs', 'console.log(`\\n✓ da ghi provenance/manifest.json — ${n} artifact, tong ${mb} MB`);'],
    ['tools/scope/gen-closure.mjs', 'console.log(`  tong thu muc      : ${dirs.size}`);'],
    // second pass: found by READING the flagged files, not by the guard reporting them
    ['tools/codemod/find-half-renames.mjs', 'console.log(`    ${a.padEnd(24)} -> ${aglOf(a).padEnd(26)} ${n} tham chieu con sot`);'],
    ['tools/codemod/find-half-renames.mjs', 'console.log(`\\n✓ Da sua ${fixedRefs} tham chieu tren ${fixedFiles} file.`);']
];

/**
 * Recall is better, not complete — and saying so is the point of this block.
 *
 * These lines were in the same files, were plainly Vietnamese, and the strengthened guard
 * still does not see them. Every one needs a word that fails the admission test: `them`,
 * `sung` and `song` are English; `bo`, `gi`, `so` are too short to be anything; `quet`,
 * `giu` and `nguyen` are a name or near enough. Buying these few lines would cost the
 * credibility of the whole guard, so the trade is refused and written down instead.
 *
 * The assertion below is not protecting the weakness — it is keeping this list HONEST. The
 * day someone widens the word lists and one of these starts being caught, this test fails
 * and tells them to promote the line into the regression corpus above.
 */
const KNOWN_UNCAUGHT = [
    'console.log(`  dong import bo sung: ${importsAdded}`);',
    'console.log(`  them Eager         : ${added}`);',
    'console.log(`  file quet   : ${files.length}`);',
    'console.log(`  file doi    : ${changed}`);',
    'console.log(`  file giu nguyen: ${untouched}`);'
];

test('the documented recall limits are still real limits, not stale pessimism', () => {
    const nowCaught = KNOWN_UNCAUGHT.filter((line) => classifyLine(line) !== null);
    assert.deepEqual(
        nowCaught,
        [],
        'recall improved — these are caught now, so move them into ESCAPED_2026_08_02 ' +
            `and delete them from KNOWN_UNCAUGHT:\n${nowCaught.map((l) => `  ${l}`).join('\n')}`
    );
});

test('every line that escaped the guard on 2026-08-02 is caught now', () => {
    const missed = ESCAPED_2026_08_02.filter(([, line]) => classifyLine(line) === null);
    assert.deepEqual(missed, [], `still invisible to the guard:\n${missed.map(([f, l]) => `  ${f}: ${l}`).join('\n')}`);
});

test('one strong word alone is enough — the two-hit rule was half the hole', () => {
    // The line that proved it: exactly one listed word (`khong`) in a whole Vietnamese
    // sentence, so the old "two distinct hits" rule scored it 1 and stayed green.
    const line = 'throw new Error(`Khong tim thay pnpm-workspace.yaml khi do nguoc tu ${from}`);';
    const verdict = classifyLine(line);
    assert.equal(verdict?.kind, 'unaccented');
    assert.deepEqual(verdict.hits, ['khong']);
});

test('English, code, and the inherited foreign fixtures stay clean', () => {
    for (const line of [
        // the original draft's false positives, kept as permanent negative cases
        "const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];",
        'cursor: se-resize;',
        '<i class="pi pi-ban"></i>',
        'not all of them are covered by this rule',
        // French and Turkish fixtures inherited from upstream: à é ü carry no Vietnamese
        // signal and are deliberately unmatched, so the guard stays believable.
        'const label = "Case à cocher spéciale";',
        'const title = "Drawer simülasyonu";',
        // real English prose from this repo
        'Offline record of the upstream MIT artifacts. See PROVENANCE.md.',
        'Every version above the ones listed below carries the commercial PrimeUI license.',
        // a single WEAK word can never fail a build on its own
        'const tim = new Timer();',
        'lop off the trailing slash before comparing',
        'this.dong = false;'
    ]) {
        assert.equal(classifyLine(line), null, `false positive on: ${line}`);
    }
});

test('`cac` is not a strong word — it is a real npm package in pnpm-lock.yaml', () => {
    // Regression: `cac` was promoted to STRONG for one run and immediately failed the
    // build on three lockfile lines. Dependency names are the lockfile's own facts.
    assert.equal(VN_WORDS_STRONG.includes('cac'), false);
    assert.equal(classifyLine('  cac@6.7.14:'), null);
    assert.equal(classifyLine('      cac: 6.7.14'), null);
});

test('no word is in both tiers, and no strong word is plain English', () => {
    const strong = new Set(VN_WORDS_STRONG);
    const both = VN_WORDS_WEAK.filter((w) => strong.has(w));
    assert.deepEqual(both, [], `a word must live in exactly one tier: ${both.join(', ')}`);

    // The admission test for STRONG, as far as a test can enforce it: the words that were
    // caught being English in earlier drafts must never be promoted.
    for (const english of ['them', 'thu', 'ban', 'se', 'da', 'de', 'vi', 'sung', 'sang', 'con', 'song', 'tin']) {
        assert.equal(strong.has(english), false, `\`${english}\` is an English word — it cannot be STRONG`);
    }
    // Ordinary French, and the inherited fixtures are French.
    for (const french of ['mot', 'moi']) {
        assert.equal(strong.has(french), false, `\`${french}\` is ordinary French — it cannot be STRONG`);
    }
    // Common Vietnamese personal names: a contributor list would light the guard up.
    for (const name of ['nguyen', 'nhung', 'trinh', 'dieu', 'huyen', 'phuong']) {
        assert.equal(strong.has(name), false, `\`${name}\` is a common personal name — it cannot be STRONG`);
    }
});

test('â ê ô stay in VN_CHARS — dropping them is the edit that guts the detector', () => {
    // `không` and `một` are the two most common words in Vietnamese and both hide behind
    // these three characters. The tempting "fix" when a French fixture goes red is to drop
    // them; that trade blinds the accented detector completely.
    for (const word of ['không', 'một', 'â', 'ê', 'ô']) {
        assert.equal(VN_CHARS.test(word), true, `VN_CHARS no longer matches ${word}`);
    }
    // Plain accents carry no Vietnamese signal and must stay unmatched.
    for (const word of ['à', 'é', 'ì', 'ó', 'ú', 'ã', 'õ', 'ç', 'ñ', 'ü', 'ö']) {
        assert.equal(VN_CHARS.test(word), false, `VN_CHARS wrongly matches ${word}`);
    }
});

test('tools/ is inside the guard scope — that was the wrong guess when this hole was found', () => {
    // The first read of the escape was "the guard must not scan tools/". It does. The hole
    // was recall, not scope, and this test keeps the two from being confused again.
    const files = scannedFiles();
    assert.ok(files.includes('tools/scope/gen-closure.mjs'), 'tools/ must be scanned');
    assert.ok(files.includes('tools/codemod/rename.mjs'), 'tools/codemod/ must be scanned');
    assert.ok(files.includes('pnpm-lock.yaml'), 'the lockfile is scanned — hence the `cac` case');

    // attic/ is verbatim unported upstream; .agl/ and ref/ are not published at all.
    assert.ok(!files.some((f) => f.startsWith('packages/angulux/attic/')), 'attic/ is exempt');
    assert.ok(!files.some((f) => f.startsWith('.agl/')), '.agl/ is exempt');
    assert.ok(!files.some((f) => f.startsWith('ref/')), 'ref/ is exempt');
});
