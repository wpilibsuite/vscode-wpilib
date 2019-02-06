'use strict';

import * as vscode from 'vscode';
import { ICodeBuilder, IExecuteAPI, IExternalAPI, IPreferencesAPI } from 'vscode-wpilibapi';
import { logger } from '../logger';
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
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }

  public async runBuilder(workspace: vscode.WorkspaceFolder, _: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    const command = 'build generateVsCodeConfig ' + args.join(' ');
    const prefs = this.preferences.getPreferences(workspace);
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'C++ Build', this.executeApi, prefs);
    logger.log(result.toString());
    return true;
  }

  public getDisplayName(): string {
    return 'cpp';
  }

  public getDescription(): string {
    return 'C++ Build';
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
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }

  public async runBuilder(workspace: vscode.WorkspaceFolder, _: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    const command = 'check ' + args.join(' ');
    const prefs = this.preferences.getPreferences(workspace);
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'C++ Test', this.executeApi, prefs);

    logger.log(result.toString());
    return true;
  }

  public getDisplayName(): string {
    return 'cpp';
  }

  public getDescription(): string {
    return 'C++ Test';
  }
}

export class BuildTest {
  private build: CodeBuilder;
  private test: CodeTester;

  constructor(externalApi: IExternalAPI) {
    const buildTestApi = externalApi.getBuildTestAPI();

    buildTestApi.addLanguageChoice('cpp');

    this.build = new CodeBuilder(externalApi);
    this.test = new CodeTester(externalApi);

    buildTestApi.registerCodeBuild(this.build);
    buildTestApi.registerCodeTest(this.test);
  }

  public dispose() {
    //
  }
}
