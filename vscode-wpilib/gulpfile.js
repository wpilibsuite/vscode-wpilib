/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');

const ts = require('gulp-typescript');
const typescript = require('typescript');
const sourcemaps = require('gulp-sourcemaps');
const jsontransform = require('gulp-json-transform');
const del = require('del');
const nls = require('vscode-nls-dev');

// If all VS Code langaues are support you can use nls.coreLanguages
const languages = [{
	id: 'zh-CN'
}];

const defaultActivationEvents = [
	"workspaceContains:.wpilib/wpilib_preferences.json",
	"workspaceContains:build/vscodeconfig.json"
]

//---- internal

function updateActivationCommands() {
	return gulp.src(['./package.json'])
		.pipe(jsontransform((data) => {
			const activationEvents = [];
			for (const evnt of defaultActivationEvents) {
				activationEvents.push(evnt);
			}
			for (const cmd of data.contributes.commands) {
				activationEvents.push(`onCommand:${cmd.command}`);
			}
			data.activationEvents = activationEvents;
			return data;
		}, 4))
		.pipe(gulp.dest('./'));
}

gulp.task('update-activation', () => {
	return updateActivationCommands();
});

gulp.task('add-i18n', function() {
	return gulp.src(['package.nls.json'])
		.pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
		.pipe(gulp.dest('.'));
});

gulp.task('clean', function() {
	return del(['package.nls.*.json', 'vscode-wpilib*.vsix']);
})

gulp.task('build', gulp.series('clean', 'add-i18n', 'update-activation'));

gulp.task('default', gulp.series('build'));
