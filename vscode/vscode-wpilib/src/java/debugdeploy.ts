'use strict';

import * as vscode from 'vscode';
import { gradleRun, parseGradleOutput } from '../shared/gradle';
import { IDeployDebugAPI, IPreferencesAPI, ICodeDeployer } from '../shared/externalapi';
import { DebugCommands, startDebugging } from './debug';

class DebugCodeDeployer implements ICodeDeployer {
  private preferences: IPreferencesAPI;
  private gradleChannel: vscode.OutputChannel;

  constructor(preferences: IPreferencesAPI, gradleChannel: vscode.OutputChannel) {
    this.preferences = preferences;
    this.gradleChannel = gradleChannel;
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = await this.preferences.getPreferences(workspace);
    if (prefs === undefined) {
      console.log('Preferences without workspace?');
      return false;
    }
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'java';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'deploy --offline -PdebugMode -PteamNumber=' + teamNumber;
    this.gradleChannel.clear();
    this.gradleChannel.show();
    const result = await gradleRun(command, workspace.uri.fsPath, this.gradleChannel);
    if (result.success) {
      this.gradleChannel.appendLine('Success!');
    } else {
      return false;
    }
    const parsed = parseGradleOutput(result);

    const config: DebugCommands = {
      serverAddress: parsed.ip,
      serverPort: parsed.port,
      workspace: workspace
    };

    await startDebugging(config);

    console.log(result);
    return true;
  }
  public getDisplayName(): string {
    return 'java';
  }
  public getDescription(): string {
    return 'Java Debugging';
  }
}

class DeployCodeDeployer implements ICodeDeployer {
  private preferences: IPreferencesAPI;
  private gradleChannel: vscode.OutputChannel;

  constructor(preferences: IPreferencesAPI, gradleChannel: vscode.OutputChannel) {
    this.preferences = preferences;
    this.gradleChannel = gradleChannel;
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = await this.preferences.getPreferences(workspace);
    if (prefs === undefined) {
      console.log('Preferences without workspace?');
      return false;
    }
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'java';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'deploy --offline -PteamNumber=' + teamNumber;
    this.gradleChannel.clear();
    this.gradleChannel.show();
    if (workspace === undefined) {
      vscode.window.showInformationMessage('No workspace selected');
      return false;
    }
    const result = await gradleRun(command, workspace.uri.fsPath, this.gradleChannel);
    if (result.success) {
      this.gradleChannel.appendLine('Success!');
    } else {
      return false;
    }
    console.log(result);
    return true;
  }
  public getDisplayName(): string {
    return 'java';
  }
  public getDescription(): string {
    return 'Java Deploy';
  }
}

export class DebugDeploy {
  private debugDeployer: DebugCodeDeployer;
  private deployDeployer: DeployCodeDeployer;


  constructor(debugDeployApi: IDeployDebugAPI, preferences: IPreferencesAPI, gradleChannel: vscode.OutputChannel, allowDebug: boolean) {
    debugDeployApi = debugDeployApi;
    debugDeployApi.addLanguageChoice('java');

    this.debugDeployer = new DebugCodeDeployer(preferences, gradleChannel);
    this.deployDeployer = new DeployCodeDeployer(preferences, gradleChannel);

    debugDeployApi.registerCodeDeploy(this.deployDeployer);

    if (allowDebug) {
      debugDeployApi.registerCodeDebug(this.debugDeployer);
    }
  }

  public dispose() {

  }
}
