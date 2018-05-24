'use strict';

import * as vscode from 'vscode';
import { IBuildTestAPI, IPreferencesAPI } from '../shared/externalapi';
import { gradleRun } from '../shared/gradle';

export class BuildTest {

  constructor(buildTestApi: IBuildTestAPI, preferences: IPreferencesAPI) {

    buildTestApi.addLanguageChoice('cpp');

    buildTestApi.registerCodeBuild({
      async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = preferences.getPreferences(workspace);
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'cpp';
      },
      async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const command = 'assemble';
        const online = preferences.getPreferences(workspace).getOnline();
        const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'C++ Build');
        console.log(result);
        return true;
      },
      getDisplayName(): string {
        return 'cpp';
      },
      getDescription(): string {
        return 'C++ Build';
      },
    });

    buildTestApi.registerCodeTest({
      async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = preferences.getPreferences(workspace);
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'cpp';
      },
      async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const command = 'test';
        const online = preferences.getPreferences(workspace).getOnline();
        const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'C++ Test');

        console.log(result);
        return true;
      },
      getDisplayName(): string {
        return 'cpp';
      },
      getDescription(): string {
        return 'C++ Test';
      },
    });
  }

  // tslint:disable-next-line:no-empty
  public dispose() {

  }
}
