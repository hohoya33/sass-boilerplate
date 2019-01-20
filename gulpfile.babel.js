'use strict';
/**
 * modules
 */
import path from 'path';
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import readlineSync from 'readline-sync';
import pump from 'pump';
import fs from 'fs';
// sass sprites
import nodeSass from 'node-sass';
import buffer from 'vinyl-buffer';
import merge from 'merge-stream';
import yargs from 'yargs';
import spritesmith from 'gulp.spritesmith';
// ejs
import ejs from 'gulp-ejs';
import rename from 'gulp-rename';
import plumber from 'gulp-plumber';

const $ = gulpLoadPlugins();
const pattern = [{
  pattern: /\\r\\n/g,
  replacement: '\\n'
}];
const paths = {
  root: {
    baseDir: './ssgui/',
    src: ''
  },
  build: {
      html: '/dist/html/',
      js: '/dist/js/',
      css: '/dist/css/',
      img: '/dist/img/'
  },
  src: {
      html: '',
      ejs: '',
      js: '',
      css: '',
      sass: '',
      img: '',
  },
  globs: {
      html: '/src/**/*.html',
      ejs: '/src/**/*.ejs',
      js: '/src/js/**/*.js',
      css: '/src/css/**/*.css',
      sass: '/src/sass/**/*.scss',
      img: '/src/img/**/*.*'
  }
};

// browserSync
const reload = (done) => {
  browserSync.reload();
  done();
};

// prompt
const getFolderName = (path, subFolder) => {
  return fs.readdirSync(path).filter(function(file) {
      if (subFolder) {
          return fs.existsSync(path + '/' + file + subFolder);
      } else {
          return fs.statSync(path + '/' + file).isDirectory();
      }
  });
};

const setService = (done) => {
  let choices = getFolderName(paths.root.baseDir);
  let index = readlineSync.keyInSelect(choices, `Select Service Folder`);
  paths.root.src = paths.root.baseDir + choices[index] + '/';
  return done();
};

const setDevice = (done) => {
  let choices = getFolderName(paths.root.src);
  let index = readlineSync.keyInSelect(choices, `[${paths.root.src}] Select Device Folder`);
  paths.root.src += choices[index];
  paths.src.html = paths.root.src + paths.globs.html;
  paths.src.ejs = paths.root.src + paths.globs.ejs;
  paths.src.js = paths.root.src + paths.globs.js;
  paths.src.sass = paths.root.src + paths.globs.sass;
  paths.build.css = paths.root.src + paths.build.css;
  return done();
};

const sassFunctions = () => {
  const types = nodeSass.types;
  let options = options || {};
  options.base = options.base || process.cwd();

  let funcs = {
    'data-uri($file)': function(filePath, done) {
      let file = path.resolve(options.base, filePath.getValue()),
      ext = file.split('.').pop();

      fs.readFile(file, function(err, data) {
        if (err) {
          return done(err);
        }
        data = new Buffer(data);
        data = data.toString('base64');
        data = 'data:image/' + ext + ';base64,' + data;
        data = types.String(data);
        done(data);
      });
    }
  };

  return funcs;
};

// tasks
gulp.task('selectServiceFolder', gulp.series(setService, setDevice))

gulp.task('styles', (cb) =>
  pump([
    gulp.src(paths.src.sass),
    buffer(),
    $.sass({
      outputStyle: 'expanded', // nested, expanded, compact, compressed
      indentWidth: 4,
      functions: sassFunctions()
    }),
    $.autoprefixer('last 2 version', 'ie 8', 'ie 7'),
    $.sourcemaps.write('.'),
    $.if('*.map', $.frep(pattern)),
    gulp.dest(paths.build.css)
  ], cb)
)

gulp.task('ejs', () =>
  pump([
    gulp.src([paths.src.ejs, `!${paths.root.src}/src/html/includes/**/*.ejs`]),
    $.plumber(),
    $.ejs(),
    $.rename({extname: '.html'}),
    gulp.dest(file => file.base)
  ])
)

gulp.task('serve',
  gulp.series('selectServiceFolder', gulp.parallel('styles', 'ejs'), () => {
    browserSync({
      notify: false,
      logPrefix: 'SSG',
      server: {
        baseDir: './',
        directory: true
      },
      port: 3000
    });

    gulp.watch(paths.src.html, reload);
    gulp.watch(paths.src.ejs, gulp.series(gulp.parallel('ejs'), reload));
    gulp.watch(paths.src.sass, gulp.series(gulp.parallel('styles'), reload));
    gulp.watch([paths.src.js, '!**/*.min.js'], reload);
  })
)

gulp.task('build', gulp.series('selectServiceFolder', gulp.parallel('styles', 'ejs')));
gulp.task('default', gulp.series('serve'));