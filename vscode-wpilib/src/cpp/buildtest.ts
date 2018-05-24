'use strict';

import * as vscode from 'vscode';
import { IExternalAPI } from '../shared/externalapi';
import { gradleRun } from '../utilities';

export class BuildTest {
  constructor(externalApi: IExternalAPI) {
    const buildTestApi = externalApi.getBuildTestAPI();
    const preferences = externalApi.getPreferencesAPI();
    const executeApi = externalApi.getExecuteAPI();

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
        const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'C++ Build', executeApi);
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
        const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'C++ Test', executeApi);

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
