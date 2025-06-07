/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');

const yaml = require('gulp-yaml');
const del = require('del');
const nls = require('vscode-nls-dev');

// If all VS Code languages are supported you can use nls.coreLanguages
const languages = [
  {
    id: 'zh-CN',
  },
];


gulp.task('i18n-compile', function () {
  return gulp.src('./locale/**/*.yaml').pipe(yaml()).pipe(gulp.dest('./i18n/'));
});

gulp.task('i18n-additional', function () {
  return gulp
    .src(['package.nls.json'])
    .pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
    .pipe(gulp.dest('.'));
});

gulp.task('clean', function() {
	return del(['package.nls.*.json', 'vscode-wpilib*.vsix', 'out/']);
})

gulp.task('build', gulp.series('clean', 'i18n-compile', 'i18n-additional'));

gulp.task('default', gulp.series('build'));
