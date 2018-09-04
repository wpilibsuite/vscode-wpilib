'use strict';

import * as vscode from 'vscode';
import { ICodeBuilder, IExecuteAPI, IExternalAPI, IPreferencesAPI } from 'vscode-wpilibapi';
import { gradleRun } from '../utilities';

class CodeBuilder implements ICodeBuilder {
  private preferences: IPreferencesAPI;
  private executeApi: IExecuteAPI;

  constructor(externalApi: IExternalAPI) {
    this.preferences = externalApi.getPreferencesAPI();
    this.executeApi = externalApi.getExecuteAPI();
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = this.preferences.getPreferences(workspace);
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'java';
  }

  public async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'build';
    const prefs = this.preferences.getPreferences(workspace);
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'Java Build', this.executeApi, prefs);
    console.log(result);
    return true;
  }

  public getDisplayName(): string {
    return 'java';
  }

  public getDescription(): string {
    return 'Java Build';
  }
}

class CodeTester implements ICodeBuilder {
  private preferences: IPreferencesAPI;
  private executeApi: IExecuteAPI;

  constructor(externalApi: IExternalAPI) {
    this.preferences = externalApi.getPreferencesAPI();
    this.executeApi = externalApi.getExecuteAPI();
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = this.preferences.getPreferences(workspace);
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'java';
  }

  public async runBuilder(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'test';
    const prefs = this.preferences.getPreferences(workspace);
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'Java Test', this.executeApi, prefs);

    console.log(result);
    return true;
  }

  public getDisplayName(): string {
    return 'java';
  }

  public getDescription(): string {
    return 'Java Test';
  }
}

export class BuildTest {
  private build: CodeBuilder;
  private test: CodeTester;

  constructor(externalApi: IExternalAPI) {
    const buildTestApi = externalApi.getBuildTestAPI();

    buildTestApi.addLanguageChoice('java');

    this.build = new CodeBuilder(externalApi);
    this.test = new CodeTester(externalApi);

    buildTestApi.registerCodeBuild(this.build);
    buildTestApi.registerCodeTest(this.test);
  }

  public dispose() {
    //
  }
}
