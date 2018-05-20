'use strict';

import * as vscode from 'vscode';
import { IBuildTestAPI, IPreferencesAPI } from '../shared/externalapi';
import { gradleRun } from '../shared/gradle';

export class BuildTest {

  constructor(buildTestApi: IBuildTestAPI, preferences: IPreferencesAPI) {

    buildTestApi.addLanguageChoice('java');

    buildTestApi.registerCodeBuild({
      async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = await preferences.getPreferences(workspace);
        if (prefs === undefined) {
          console.log('Preferences without workspace?');
          return false;
        }
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'java';
      },
      async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const command = 'assemble --offline';
        if (workspace === undefined) {
          vscode.window.showInformationMessage('No workspace selected');
          return false;
        }
        const result = await gradleRun(command, workspace.uri.fsPath, workspace);
        console.log(result);
        return true;
      },
      getDisplayName(): string {
        return 'java';
      },
      getDescription(): string {
        return 'Java Build';
      }
    });

    buildTestApi.registerCodeTest({
      async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = await preferences.getPreferences(workspace);
        if (prefs === undefined) {
          console.log('Preferences without workspace?');
          return false;
        }
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'java';
      },
      async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const command = 'test --offline';
        const result = await gradleRun(command, workspace.uri.fsPath, workspace);
        console.log(result);
        return true;
      },
      getDisplayName(): string {
        return 'java';
      },
      getDescription(): string {
        return 'Java Test';
      }
    });
  }

  public dispose() {

  }
}
