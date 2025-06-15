/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { globSync } from 'fs';
import { rm } from 'fs/promises';
import gulp from 'gulp';
import yaml from 'gulp-yaml';
import nls from 'vscode-nls-dev';

// If all VS Code languages are supported you can use nls.coreLanguages
const languages = [
  {
    id: 'zh-CN',
  },
];

gulp.task('i18n-compile', async () =>
  gulp.src('./locale/**/*.yaml').pipe(yaml()).pipe(gulp.dest('./i18n/'))
);

gulp.task('i18n-additional', async () =>
  gulp
    .src(['package.nls.json'])
    .pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
    .pipe(gulp.dest('.'))
);

gulp.task('clean', async () => {
  await rm('out/', { force: true, recursive: true });
  globSync(['package.nls.*.json', '*.vsix']).map(async (file) => await rm(file));
});

gulp.task('build', gulp.series('clean', 'i18n-compile', 'i18n-additional'));

gulp.task('default', gulp.series('build'));
