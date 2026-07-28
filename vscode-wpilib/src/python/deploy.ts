'use strict';

import * as vscode from 'vscode';
import { ICodeDeployer, IExecuteAPI, IExternalAPI, IPreferencesAPI } from '../api';
import { robotpyRun } from '../utilities';

class DeployCodeDeployer implements ICodeDeployer {
  private preferences: IPreferencesAPI;
  private executeApi: IExecuteAPI;

  constructor(externalApi: IExternalAPI) {
    this.preferences = externalApi.getPreferencesAPI();
    this.executeApi = externalApi.getExecuteAPI();
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = this.preferences.getPreferences(workspace);
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'python';
  }

  public async runDeployer(
    teamNumber: number,
    workspace: vscode.WorkspaceFolder,
    _: vscode.Uri | undefined,
    ...args: string[]
  ): Promise<boolean> {
    const command = 'deploy ' + args.join(' ');
    const prefs = this.preferences.getPreferences(workspace);

    if (!prefs.getTeamNumber()) {
      prefs.setTeamNumber(teamNumber);
    }
    const result = await robotpyRun(
      command,
      workspace.uri.fsPath,
      workspace,
      'Python Deploy',
      this.executeApi
    );
    return result === 0;
  }

  public getDisplayName(): string {
    return 'python';
  }

  public getDescription(): string {
    return 'Python Deploy';
  }
}

class SimulateCodeDeployer implements ICodeDeployer {
  private preferences: IPreferencesAPI;
  private executeApi: IExecuteAPI;

  constructor(externalApi: IExternalAPI) {
    this.preferences = externalApi.getPreferencesAPI();
    this.executeApi = externalApi.getExecuteAPI();
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = this.preferences.getPreferences(workspace);
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'python';
  }

  public async runDeployer(
    teamNumber: number,
    workspace: vscode.WorkspaceFolder,
    _source: vscode.Uri | undefined,
    ...args: string[]
  ): Promise<boolean> {
    const command = 'sim ' + args.join(' ');
    const prefs = this.preferences.getPreferences(workspace);
    if (!prefs.getTeamNumber()) {
      prefs.setTeamNumber(teamNumber);
    }
    const result = await robotpyRun(
      command,
      workspace.uri.fsPath,
      workspace,
      'Python Simulate',
      this.executeApi
    );
    if (result !== 0) return false;
    return true;
  }

  public getDisplayName(): string {
    return 'python';
  }

  public getDescription(): string {
    return 'Python Simulate';
  }
}

export function registerCodeDeploy(externalApi: IExternalAPI, allowDebug: boolean) {
  const deployApi = externalApi.getDeployDebugAPI();
  deployApi.addLanguageChoice('python');
  deployApi.registerCodeDeploy(new DeployCodeDeployer(externalApi));

  if (allowDebug) {
    deployApi.registerCodeSimulate(new SimulateCodeDeployer(externalApi));
  }
}
