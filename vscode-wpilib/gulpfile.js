/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');

const ts = require('gulp-typescript');
const typescript = require('typescript');
const sourcemaps = require('gulp-sourcemaps');
const yaml = require('gulp-yaml');
const jsontransform = require('gulp-json-transform');
const { deleteAsync } = require('del');
const nls = require('vscode-nls-dev');

// If all VS Code langaues are support you can use nls.coreLanguages
const languages = [
  {
    id: 'zh-CN',
  },
];

const defaultActivationEvents = [
  'workspaceContains:.wpilib/wpilib_preferences.json',
  'workspaceContains:build/vscodeconfig.json',
];

//---- internal

// Error handler for Gulp 5 streams
function handleError(error) {
  console.error('Error in Gulp task:', error.toString());
  this.emit('end');
}

function updateActivationCommands() {
  return gulp
    .src(['./package.json'])
    .pipe(
      jsontransform((data) => {
        const activationEvents = [];
        for (const evnt of defaultActivationEvents) {
          activationEvents.push(evnt);
        }
        for (const cmd of data.contributes.commands) {
          activationEvents.push(`onCommand:${cmd.command}`);
        }
        data.activationEvents = activationEvents;
        return data;
      }, 4)
    )
    .on('error', handleError)
    .pipe(gulp.dest('./'))
    .on('error', handleError);
}

gulp.task('update-activation', () => {
  return updateActivationCommands();
});

gulp.task('i18n-compile', function () {
  return gulp.src('./locale/**/*.yaml')
    .pipe(yaml())
    .on('error', handleError)
    .pipe(gulp.dest('./i18n/'))
    .on('error', handleError);
});

gulp.task('i18n-additional', function () {
  return gulp
    .src(['package.nls.json'])
    .pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
    .on('error', handleError)
    .pipe(gulp.dest('.'))
    .on('error', handleError);
});

gulp.task('clean', function () {
  return deleteAsync(['package.nls.*.json', 'vscode-wpilib*.vsix']);
});

gulp.task('build', gulp.series('clean', 'i18n-compile', 'i18n-additional', 'update-activation'));

gulp.task('default', gulp.series('build'));
