/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');

const jsontransform = require('gulp-json-transform');
const defaultActivationEvents = [
	"workspaceContains:.wpilib/wpilib_preferences.json",
	"workspaceContains:build/vscodeconfig.json"
]

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
