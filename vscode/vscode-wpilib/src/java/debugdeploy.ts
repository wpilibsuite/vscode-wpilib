'use strict';

import * as vscode from 'vscode';
import { gradleRun } from '../shared/gradle';
import { IDeployDebugAPI, IPreferencesAPI, ICodeDeployer } from '../shared/externalapi';
import { DebugCommands, startDebugging } from './debug';
import { readFileAsync } from '../utilities';
import * as path from 'path';
import * as jsonc from 'jsonc-parser';

interface JavaDebugInfo {
  debugfile: string;
  project: string;
  artifact: string;
}

class JavaDebugQuickPick implements vscode.QuickPickItem {
  public label: string;
  public description?: string | undefined;
  public detail?: string | undefined;
  public picked?: boolean | undefined;

  public debugInfo: JavaDebugInfo;

  public constructor(debugInfo: JavaDebugInfo) {
    this.debugInfo = debugInfo;
    this.label = debugInfo.artifact;
  }
}

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

    const debugInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'debuginfo.json'));
    const parsedDebugInfo: JavaDebugInfo[] = jsonc.parse(debugInfo);
    let targetDebugInfo = parsedDebugInfo[0];
    if (parsedDebugInfo.length > 1) {
      const arr: JavaDebugQuickPick[] = [];
      for (const i of parsedDebugInfo) {
        arr.push(new JavaDebugQuickPick(i));
      }
      const picked = await vscode.window.showQuickPick(arr, {
        placeHolder: 'Select an artifact'
      });
      if (picked === undefined) {
        vscode.window.showInformationMessage('Artifact cancelled');
        return false;
      }
      targetDebugInfo = picked.debugInfo;
    }

    const debugPath = path.join(workspace.uri.fsPath, 'build', 'debug', targetDebugInfo.debugfile);

    const targetReadInfo = await readFileAsync(debugPath);
    const targetInfoParsed = jsonc.parse(targetReadInfo);

    const config: DebugCommands = {
      serverAddress: targetInfoParsed.ipAddress,
      serverPort: targetInfoParsed.port,
      project: targetDebugInfo.project,
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
