'use strict';

import * as vscode from 'vscode';
import { IBuildTestAPI, IPreferencesAPI } from '../shared/externalapi';
import { gradleRun } from '../shared/gradle';

export class BuildTest {

  constructor(buildTestApi: IBuildTestAPI, gradleChannel: vscode.OutputChannel, preferences: IPreferencesAPI) {

    buildTestApi.addLanguageChoice('cpp');

    buildTestApi.registerCodeBuild({
      async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const prefs = await preferences.getPreferences(workspace);
        if (prefs === undefined) {
          console.log('Preferences without workspace?');
          return false;
        }
        const currentLanguage = prefs.getCurrentLanguage();
        return currentLanguage === 'none' || currentLanguage === 'cpp';
      },
      async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const command = 'assemble --offline';
        gradleChannel.clear();
        gradleChannel.show();
        if (workspace === undefined) {
          vscode.window.showInformationMessage('No workspace selected');
          return false;
        }
        const result = await gradleRun(command, workspace.uri.fsPath, gradleChannel);
        console.log(result);
        return true;
      },
      getDisplayName(): string {
        return 'cpp';
      },
      getDescription(): string {
        return 'C++ Build';
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
        return currentLanguage === 'none' || currentLanguage === 'cpp';
      },
      async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        const command = 'test --offline';
        gradleChannel.clear();
        gradleChannel.show();
        const result = await gradleRun(command, workspace.uri.fsPath, gradleChannel);

        console.log(result);
        return true;
      },
      getDisplayName(): string {
        return 'cpp';
      },
      getDescription(): string {
        return 'C++ Test';
      }
    });
  }

  public dispose() {

  }
}
