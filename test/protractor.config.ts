import './_specHelper';
exports.config = {
    directConnect: true,
    capabilities: {
        'browserName': 'chrome'
    },
    chromeDriver: require('chromedriver').path,
    framework: 'mocha',
    specs: ['**/*.feature.js'],
    mochaOpts: {
        reporter: 'spec',
        slow: 3000,
        timeout: 4000
    },
    rootElement: 'trans-app',
    baseUrl: 'http://localhost:3000',
    useAllAngular2AppRoots: true
};