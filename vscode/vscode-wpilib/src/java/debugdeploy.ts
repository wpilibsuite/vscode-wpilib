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

  constructor(preferences: IPreferencesAPI) {
    this.preferences = preferences;
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = await this.preferences.getPreferences(workspace);
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'java';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder, online: boolean): Promise<boolean> {
    const command = 'deploy -PdebugMode -PteamNumber=' + teamNumber;
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online);
    if (result === 0) {
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

  constructor(preferences: IPreferencesAPI) {
    this.preferences = preferences;
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = await this.preferences.getPreferences(workspace);
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'java';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder, online: boolean): Promise<boolean> {
    const command = 'deploy -PteamNumber=' + teamNumber;
    if (workspace === undefined) {
      vscode.window.showInformationMessage('No workspace selected');
      return false;
    }
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online);
    if (result === 0) {
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


  constructor(debugDeployApi: IDeployDebugAPI, preferences: IPreferencesAPI, allowDebug: boolean) {
    debugDeployApi = debugDeployApi;
    debugDeployApi.addLanguageChoice('java');

    this.debugDeployer = new DebugCodeDeployer(preferences);
    this.deployDeployer = new DeployCodeDeployer(preferences);

    debugDeployApi.registerCodeDeploy(this.deployDeployer);

    if (allowDebug) {
      debugDeployApi.registerCodeDebug(this.debugDeployer);
    }
  }

  public dispose() {

  }
}
