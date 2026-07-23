/**
 * Conventional Commits configuration.
 *
 * This is not style policing. semantic-release reads these messages to decide whether a
 * release happens and how the version moves, so a mistyped type silently produces no
 * release and a missed `!` silently produces the wrong one. The format is load-bearing.
 *
 * Enforced in two places, on purpose:
 *   • PR titles          — .github/workflows/pr-title.yml (this repository squash-merges,
 *                          so the title is the message that lands on main)
 *   • commits on a branch — locally, via this config
 *
 * Uses @commitlint/config-conventional as the base. Run it without installing:
 *   npx --yes -p @commitlint/cli -p @commitlint/config-conventional commitlint --from main
 */
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'build', 'ci', 'chore', 'revert']
        ],

        // Scopes are free-form: they are mostly module names, and a fixed list would need
        // editing every time a module is promoted out of the attic.
        'scope-case': [2, 'always', 'kebab-case'],

        'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
        'subject-empty': [2, 'never'],
        'subject-full-stop': [2, 'never', '.'],
        'subject-min-length': [2, 'always', 6],

        // Long subjects get truncated in changelogs and release notes, which are the two
        // places anyone will ever read them.
        'header-max-length': [2, 'always', 100],

        // The body is where a decision gets explained. Nothing forces one, but if it is
        // there it must be readable.
        'body-leading-blank': [2, 'always'],
        'body-max-line-length': [1, 'always', 100],
        'footer-leading-blank': [2, 'always']
    }
};
