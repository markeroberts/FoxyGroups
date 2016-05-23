var gulp       = require('gulp'),
	sass       = require('gulp-sass'),
	sourcemaps = require('gulp-sourcemaps');

gulp.task('sass', function() {
  return gulp.src('css/layout.scss')
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('css'));
});

gulp.task('watch', function() {
	gulp.watch('css/*.scss', gulp.series('sass'));
});

gulp.task('default', gulp.series('watch'));