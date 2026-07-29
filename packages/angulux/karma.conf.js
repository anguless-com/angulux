// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
    config.set({
        basePath: '',
        // No '@angular-devkit/build-angular' framework or plugin here: the builder is
        // @angular/build:karma, which injects its own. Leaving them in is not merely
        // redundant — the builder strips them at startup and warns, and the package that
        // provides them is deliberately no longer installed.
        frameworks: ['jasmine'],
        plugins: [require('karma-jasmine'), require('karma-chrome-launcher'), require('karma-jasmine-html-reporter'), require('karma-coverage')],
        client: {
            clearContext: false, // leave Jasmine Spec Runner output visible in browser
            jasmine: {
                random: false,
                stopOnFailure: true
            }
        },
        coverageReporter: {
            dir: require('path').join(__dirname, './coverage/primeng'),
            subdir: '.',
            reporters: [{ type: 'html' }, { type: 'text-summary' }]
        },
        reporters: ['progress', 'kjhtml'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless']
    });
};
