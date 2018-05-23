'use strict';

import * as vscode from 'vscode';
import { IBuildTestAPI, IPreferencesAPI } from '../shared/externalapi';
import { gradleRun } from '../shared/gradle';

export class BuildTest {

  constructor(buildTestApi: IBuildTestAPI, preferences: IPreferencesAPI) {

    buildTestApi.addLanguageChoice('java');

    buildTestApi.registerCodeBuild({
      async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = preferences.getPreferences(workspace);
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'java';
      },
      async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const command = 'assemble';
        const online = preferences.getPreferences(workspace).getOnline();
        const result = await gradleRun(command, workspace.uri.fsPath, workspace, online);
        console.log(result);
        return true;
      },
      getDisplayName(): string {
        return 'java';
      },
      getDescription(): string {
        return 'Java Build';
      },
    });

    buildTestApi.registerCodeTest({
      async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = preferences.getPreferences(workspace);
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'java';
      },
      async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const command = 'test';
        const online = preferences.getPreferences(workspace).getOnline();
        const result = await gradleRun(command, workspace.uri.fsPath, workspace, online);
        console.log(result);
        return true;
      },
      getDisplayName(): string {
        return 'java';
      },
      getDescription(): string {
        return 'Java Test';
      },
    });
  }

  // tslint:disable-next-line:no-empty
  public dispose() {

  }
}
