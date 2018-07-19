'use strict';

import * as vscode from 'vscode';
import { ICodeBuilder, IExecuteAPI, IExternalAPI, IPreferencesAPI } from '../shared/externalapi';
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
    const command = 'assemble';
    const online = this.preferences.getPreferences(workspace).getOnline();
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'Java Build', this.executeApi);
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
    const online = this.preferences.getPreferences(workspace).getOnline();
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'Java Test', this.executeApi);

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
