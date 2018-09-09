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
const es = require('event-stream');
const nls = require('vscode-nls-dev');

const tsProject = ts.createProject('./tsconfig.json', { typescript });

const inlineMap = true;
const inlineSource = false;
const outDest = 'out';

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

function compile(buildNls) {
	var r = tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject()).js
		.pipe(buildNls ? nls.rewriteLocalizeCalls() : es.through())
		.pipe(buildNls ? nls.createAdditionalLanguageFiles(languages, 'i18n', 'out') : es.through());

	if (inlineMap && inlineSource) {
		r = r.pipe(sourcemaps.write());
	} else {
		r = r.pipe(sourcemaps.write("../out", {
			// no inlined source
			includeContent: inlineSource,
			// Return relative source map root directories per file.
			sourceRoot: "../src"
		}));
	}

	return r.pipe(gulp.dest(outDest));
}

gulp.task('update-activation', () => {
	return updateActivationCommands();
});

gulp.task('internal-compile', function() {
	return compile(false);
});

gulp.task('internal-nls-compile', function() {
	return compile(true);
});

gulp.task('add-i18n', function() {
	return gulp.src(['package.nls.json'])
		.pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
		.pipe(gulp.dest('.'));
});

gulp.task('clean', function() {
	return del(['out/**', 'package.nls.*.json', 'vscode-wpilib*.vsix']);
})

gulp.task('build', gulp.series('clean', 'internal-nls-compile', 'add-i18n'));

gulp.task('compile', gulp.series('clean', 'internal-compile'));

gulp.task('default', gulp.series('build'));
