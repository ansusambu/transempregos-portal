"use strict";
const gulp = require("gulp"),
    sourcemaps = require("gulp-sourcemaps"),
    concat = require("gulp-concat"),
    mergeStream = require('merge-stream'),
    debug = require("gulp-debug"),
    nodemon = require('gulp-nodemon'),
    FileCache = require("gulp-file-cache"),
    sass = require('gulp-sass'),
    fs = require('fs'),
    path = require('path'),
    args = require('yargs').argv,
    plumber = require('gulp-plumber'),
    karmaServer = require('karma').Server,
    mocha = require('gulp-mocha'),
    // ts = require("gulp-typescript"), //todo: using exec until https://github.com/ivogabe/gulp-typescript/issues/460 is resolved
    exec = require('child_process').exec,
    browserSync = require('browser-sync'),
    intoStream = require('into-stream');
const gutil = require('gulp-util');
const { protractor, webdriver_standalone, webdriver_update } = require("gulp-protractor");

(function createGulpCacheDir() {
    var dir = path.resolve(__dirname, '.gulp-cache');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
})();

gulp.task('watch:front', ['transpile:front'], () => {
    gulp.watch('public/**/*.ts', ['transpile:front']);
    gulp.watch('public/**/*.scss', ['transpile:sass']);
    gulp.watch('public/**/*.html', ['copy:html']);
});

gulp.task('watch', ['transpile'], () => {
    gulp.watch('public/**/*.ts', ['transpile:front']);
    gulp.watch('public/**/*.scss', ['transpile:sass']);
    gulp.watch('public/**/*.html', ['copy:html']);
    gulp.watch('test/**/*.ts', ['transpile:back']);
    let nodemonOpt = {
        exec: "node --debug --harmony-async-await",
        script: 'dist/server/bin/www.js',
        ext: 'ts',
        env: {
            'NODE_ENV': 'development',
            'DEBUG': '*,-*socket*,-engine*,-koa*,-connect*,-mquery'
        },
        watch: ['server/**/*.ts'],
        tasks: ['transpile:back'],
    };
    var stream = nodemon(nodemonOpt);
    browserSync.init({
        proxy: 'http://localhost:3000',
        files: 'dist/public/**/*',
        browser: 'chrome',
        port: 7000
    });
    stream.on('start', () => {
        browserSync.reload();
    });
    return stream;
});

gulp.task('copy', ['copy:html']);

gulp.task("copy:html", () => {
    var htmlFileCache = new FileCache('.gulp-cache/.gulp-cache-html');
    return gulp.src(["public/**/*.html"])
        .pipe(plumber())
        //.pipe(htmlFileCache.filter())
        //.pipe(htmlFileCache.cache())
        .pipe(debug({ title: 'html' }))
        .pipe(gulp.dest("dist/public"));
});

gulp.task("transpile", ['copy:html'], () => {
    var merged = new mergeStream();
    merged.add(transpileFront(), transpileBack(), transpileSass());
    return merged;
});

gulp.task("transpile:front", transpileFront);
gulp.task("transpile:back", transpileBack);
gulp.task("transpile:sass", transpileSass);

gulp.task("test:front", (done) => {
    new karmaServer({
        configFile: path.resolve(__dirname, 'karma.conf.js'),
        singleRun: true
    }, done).start();
});

gulp.task("autotest", () => {
    gulp.watch('public/**/*.js', ['transpile:front']);
    gulp.watch(["server/**/*.js", "test/**/*.js"], ['transpile:back']);
    gulp.watch(["dist/server/**/*.js", "dist/test/**/*.spec.js"], ['test:back']);
    new karmaServer({
        configFile: path.resolve(__dirname, 'karma.conf.js'),
        singleRun: false
    }).start();
});

gulp.task("test:back", () => {
    return gulp.src('dist/test/**/*.spec.js', { read: false })
        .pipe(mocha({ reporter: 'spec', require: ['./dist/test/_specHelper.js'] }));
});

gulp.task("test:acceptance:setup", webdriver_update);

gulp.task("test:acceptance", ["test:acceptance:setup"], () => {
    gulp.src(["./dist/test/**/*.feature.js"])
        .pipe(protractor({
            configFile: "dist/test/protractor.config.js",
            //args: ['--baseUrl', 'http://127.0.0.1:8000']
        }))
        .on('error', (e) => { throw e; })
});

gulp.task("test", ["test:back", "test:front", "test:acceptance"]);

function transpileSass() {
    var sassFileCache = new FileCache('.gulp-cache/.gulp-cache-sass');
    return gulp.src(["public/**/*.scss"])
        .pipe(plumber())
        .pipe(sassFileCache.filter())
        .pipe(sass().on('error', sass.logError))
        .pipe(sassFileCache.cache())
        .pipe(debug({ title: 'sass' }))
        .pipe(gulp.dest("dist/public"));
}

// const tsProjectBack = ts.createProject("tsconfig.json");
function transpileBack() {
    //todo: using exec until https://github.com/ivogabe/gulp-typescript/issues/460 is resolved
    const promise = new Promise((resolve, reject) => {
        let resolveCalled = false;
        try {
            exec(`tsc --pretty --project ${__dirname}`, {
                cwd: __dirname,
            }, (err, stdout, stderr) => {
                let info = "";
                if (err)
                    info += err;
                if (stderr)
                    info += stderr;
                if (stdout)
                    info += stdout;
                gutil.log(info);
                resolveCalled = true;
                resolve("Done.");
            });
        } catch (error) {
            gutil.log(`Error: ${error}`);
            if (!resolveCalled)
                resolve();
        }
    });
    return intoStream(promise);
    // return tsProjectBack.src()
    //     .pipe(sourcemaps.init())
    //     .pipe(plumber())
    //     .pipe(debug({ title: 'back' }))
    //     .pipe(tsProjectBack()).js
    //     .pipe(sourcemaps.write('.'))
    //     .pipe(debug({ title: 'map' }))
    //     .pipe(gulp.dest("dist"));
}

// const tsProjectFront = ts.createProject("public/tsconfig.json");
function transpileFront() {
    //todo: using exec until https://github.com/ivogabe/gulp-typescript/issues/460 is resolved
    const publicPath = path.resolve(__dirname, 'public');
    const promise = new Promise((resolve, reject) => {
        let resolveCalled = false;
        try {
            exec(`tsc --pretty --project ${publicPath}`, {
                cwd: publicPath,
            }, (err, stdout, stderr) => {
                let info = "";
                if (err)
                    info += err;
                if (stderr)
                    info += stderr;
                if (stdout)
                    info += stdout;
                gutil.log(info);
                resolveCalled = true;
                resolve("Done.");
            });
        } catch (error) {
            gutil.log(`Error: ${error}`);
            if (!resolveCalled)
                resolve();
        }
    });
    return intoStream(promise);
    // return tsProjectFront.src()
    //     .pipe(sourcemaps.init())
    //     .pipe(plumber())
    //     .pipe(debug({ title: 'front' }))
    //     .pipe(tsProjectFront()).js
    //     .pipe(sourcemaps.write('.'))
    //     .pipe(gulp.dest("dist/public"));
};

gulp.task("default", ['transpile'])