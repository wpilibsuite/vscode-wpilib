'use strict';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICodeDeployer, IExecuteAPI, IExternalAPI, IPreferencesAPI } from '../shared/externalapi';
import { gradleRun, readFileAsync } from '../utilities';
import { IDebugCommands, startDebugging } from './debug';
import { ISimulateCommands, startSimulation } from './simulate';

interface IJavaDebugInfo {
  debugfile: string;
  project: string;
  artifact: string;
}

interface ITargetInfo {
  ipAddress: string;
  port: string;
}

interface IJavaSimulateInfo {
  name: string;
  extensions: string[];
  librarydir: string;
  mainclass: string;
  robotclass: string;
}

class JavaQuickPick<T> implements vscode.QuickPickItem {
  public label: string;
  public description?: string | undefined;
  public detail?: string | undefined;
  public picked?: boolean | undefined;

  public debugInfo: T;

  public constructor(debugInfo: T, label: string) {
    this.debugInfo = debugInfo;
    this.label = label;
  }
}

class DebugCodeDeployer implements ICodeDeployer {
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
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    let command = 'deploy -PdebugMode -PteamNumber=' + teamNumber;
    if (this.preferences.getPreferences(workspace).getSkipTests()) {
      command += ' -Xcheck';
    }
    const online = this.preferences.getPreferences(workspace).getOnline();
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'Java Debug', this.executeApi);
    if (result !== 0) {
      return false;
    }

    const debugInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'debuginfo.json'));
    const parsedDebugInfo: IJavaDebugInfo[] = jsonc.parse(debugInfo) as IJavaDebugInfo[];
    let targetDebugInfo = parsedDebugInfo[0];
    if (parsedDebugInfo.length > 1) {
      const arr: Array<JavaQuickPick<IJavaDebugInfo>> = [];
      for (const i of parsedDebugInfo) {
        arr.push(new JavaQuickPick<IJavaDebugInfo>(i, i.artifact));
      }
      const picked = await vscode.window.showQuickPick(arr, {
        placeHolder: 'Select an artifact',
      });
      if (picked === undefined) {
        vscode.window.showInformationMessage('Artifact cancelled');
        return false;
      }
      targetDebugInfo = picked.debugInfo;
    }

    const debugPath = path.join(workspace.uri.fsPath, 'build', 'debug', targetDebugInfo.debugfile);

    const targetReadInfo = await readFileAsync(debugPath);
    const targetInfoParsed = jsonc.parse(targetReadInfo) as ITargetInfo;

    const config: IDebugCommands = {
      project: targetDebugInfo.project,
      serverAddress: targetInfoParsed.ipAddress,
      serverPort: targetInfoParsed.port,
      workspace,
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
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    let command = 'deploy -PteamNumber=' + teamNumber;
    if (this.preferences.getPreferences(workspace).getSkipTests()) {
      command += ' -Xcheck';
    }
    const online = this.preferences.getPreferences(workspace).getOnline();
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'Java Deploy', this.executeApi);
    if (result !== 0) {
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
    return currentLanguage === 'none' || currentLanguage === 'java';
  }
  public async runDeployer(_: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'simulateExternalJava';
    const online = this.preferences.getPreferences(workspace).getOnline();
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online, 'Java Simulate', this.executeApi);
    if (result !== 0) {
      return false;
    }

    const simulateInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'desktopinfo.json'));
    const parsedSimulateInfo: IJavaSimulateInfo[] = jsonc.parse(simulateInfo) as IJavaSimulateInfo[];
    let targetSimulateInfo = parsedSimulateInfo[0];
    if (parsedSimulateInfo.length > 1) {
      const arr: Array<JavaQuickPick<IJavaSimulateInfo>> = [];
      for (const i of parsedSimulateInfo) {
        arr.push(new JavaQuickPick<IJavaSimulateInfo>(i, i.name));
      }
      const picked = await vscode.window.showQuickPick(arr, {
        placeHolder: 'Select an artifact',
      });
      if (picked === undefined) {
        vscode.window.showInformationMessage('Artifact cancelled');
        return false;
      }
      targetSimulateInfo = picked.debugInfo;
    }

    let extensions = '';
    if (targetSimulateInfo.extensions.length > 0) {
      const extList = [];
      for (const e of targetSimulateInfo.extensions) {
        extList.push({
          label: path.basename(e),
          path: e,
        });
      }
      const quickPick = await vscode.window.showQuickPick(extList, {
        canPickMany: true,
        placeHolder: 'Pick extensions to run',
      });
      if (quickPick !== undefined) {
        for (const qp of quickPick) {
          extensions += qp.path;
          extensions += path.delimiter;
        }
      }
    }

    const config: ISimulateCommands = {
      extensions,
      librarydir: targetSimulateInfo.librarydir,
      mainclass: targetSimulateInfo.mainclass,
      robotclass: targetSimulateInfo.robotclass,
      stopOnEntry: this.preferences.getPreferences(workspace).getStopSimulationOnEntry(),
      workspace,
    };

    await startSimulation(config);

    return true;
  }
  public getDisplayName(): string {
    return 'java';
  }
  public getDescription(): string {
    return 'Java Simulation';
  }
}

export class DeployDebug {
  private deployDebuger: DebugCodeDeployer;
  private deployDeployer: DeployCodeDeployer;
  private simulator: SimulateCodeDeployer;

  constructor(externalApi: IExternalAPI, allowDebug: boolean) {
    const deployDebugApi = externalApi.getDeployDebugAPI();
    deployDebugApi.addLanguageChoice('java');

    this.deployDebuger = new DebugCodeDeployer(externalApi);
    this.deployDeployer = new DeployCodeDeployer(externalApi);
    this.simulator = new SimulateCodeDeployer(externalApi);

    deployDebugApi.registerCodeDeploy(this.deployDeployer);

    if (allowDebug) {
      deployDebugApi.registerCodeDebug(this.deployDebuger);
      deployDebugApi.registerCodeSimulate(this.simulator);
    }
  }

  public dispose() {
    //
  }
}
