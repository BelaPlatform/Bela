// Gulp file for main IDE repo

var gulp = require('gulp'),
    sass = require('gulp-sass'),
    concat = require('gulp-concat'),
    autoprefixer = require('gulp-autoprefixer');

gulp.task('styles', function() {
  return gulp.src('styles/*.scss')
    .pipe(sass({
      'sourcemap=none': true
    }))
    .pipe(concat('style.css'))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1'))
    .pipe(gulp.dest('styles/'));
});

gulp.task('default', function() {
    gulp.start('styles');
    gulp.start('watch');
});

gulp.task('watch', function() {
    gulp.watch('styles/*.scss', ['styles']);
});

gulp.task('default', ['styles', 'watch']);