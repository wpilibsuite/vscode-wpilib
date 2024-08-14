'use strict';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICodeDeployer, IExecuteAPI, IExternalAPI, IPreferencesAPI } from 'vscode-wpilibapi';
import { gradleRun, readFileAsync } from '../utilities';
import { IDebugCommands, startDebugging } from './debug';
import { ISimulateCommands, startSimulation } from './simulate';

interface IJavaDebugInfo {
  name: string;
  path: string;
}

interface ITargetInfo {
  type: string;
  name: string;
  port: number;
  target: string;
  project: string;
}

interface IJavaSimExtensions {
  name: string;
  libName: string;
  defaultEnabled: boolean;
}

interface IJavaSimulateInfo {
  name: string;
  type: string;
  extensions: IJavaSimExtensions[];
  environment?: { [key: string]: string };
  libraryDir: string;
  mainClassName: string;
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
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder,
                           _: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    let command = 'deploy ' + args.join(' ') + ' -PdebugMode -PteamNumber=' + teamNumber;
    if (this.preferences.getPreferences(workspace).getSkipTests()) {
      command += ' -xcheck';
    }
    const prefs = this.preferences.getPreferences(workspace);
    // If deploy offline, and builds online, set flags
    // Otherwise, build offline will be set later
    if (prefs.getDeployOffline() && !prefs.getOffline()) {
      command += ' --offline';
    }
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'Java Debug', this.executeApi, prefs);
    if (result !== 0) {
      return false;
    }

    const debugInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'debug_info.json'), 'utf8');
    const parsedDebugInfo: IJavaDebugInfo[] = jsonc.parse(debugInfo) as IJavaDebugInfo[];
    if (parsedDebugInfo.length === 0) {
      await vscode.window.showInformationMessage('No debug configurations found. Is this a robot project?', {
        modal: true,
      });
      return false;
    }
    let targetDebugInfo = parsedDebugInfo[0];
    if (parsedDebugInfo.length > 1) {
      const arr: JavaQuickPick<IJavaDebugInfo>[] = [];
      for (const i of parsedDebugInfo) {
        arr.push(new JavaQuickPick<IJavaDebugInfo>(i, i.name));
      }
      const picked = await vscode.window.showQuickPick(arr, {
        placeHolder: 'Select a target',
      });
      if (picked === undefined) {
        vscode.window.showInformationMessage('Target cancelled');
        return false;
      }
      targetDebugInfo = picked.debugInfo;
    }

    const debugPath = targetDebugInfo.path;

    const targetReadInfo = await readFileAsync(debugPath, 'utf8');
    const targetInfoArray = jsonc.parse(targetReadInfo) as ITargetInfo[];

    if (targetInfoArray.length === 0) {
      await vscode.window.showInformationMessage('No debug configurations found. Is this a robot project?', {
        modal: true,
      });
      return false;
    }

    // TODO Filter this off of type
    let targetInfoParsed = targetInfoArray[0];
    if (targetInfoArray.length > 1) {
      const arr: JavaQuickPick<ITargetInfo>[] = [];
      for (const i of targetInfoArray) {
        arr.push(new JavaQuickPick<ITargetInfo>(i, i.name));
      }
      const picked = await vscode.window.showQuickPick(arr, {
        placeHolder: 'Select an artifact',
      });
      if (picked === undefined) {
        vscode.window.showInformationMessage('Artifact cancelled');
        return false;
      }
      targetInfoParsed = picked.debugInfo;
    }

    const config: IDebugCommands = {
      project: targetInfoParsed.project,
      serverAddress: targetInfoParsed.target,
      serverPort: targetInfoParsed.port.toString(10),
      workspace,
    };

    await startDebugging(config);
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
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder,
                           _: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    let command = 'deploy ' + args.join(' ') + ' -PteamNumber=' + teamNumber;
    if (this.preferences.getPreferences(workspace).getSkipTests()) {
      command += ' -xcheck';
    }
    const prefs = this.preferences.getPreferences(workspace);
    // If deploy offline, and builds online, set flags
    // Otherwise, build offline will be set later
    if (prefs.getDeployOffline() && !prefs.getOffline()) {
      command += ' --offline';
    }
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'Java Deploy', this.executeApi, prefs);
    if (result !== 0) {
      return false;
    }
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
  public async runDeployer(_: number, workspace: vscode.WorkspaceFolder,
                           __: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    // TODO Support debug JNI mode simulation
    const command = 'simulateExternalJavaRelease ' + args.join(' ');
    const prefs = this.preferences.getPreferences(workspace);
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'Java Simulate', this.executeApi, prefs);
    if (result !== 0) {
      return false;
    }

    const simulateInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'sim', 'release_java.json'), 'utf8');
    const parsedSimulateInfo: IJavaSimulateInfo[] = jsonc.parse(simulateInfo) as IJavaSimulateInfo[];
    if (parsedSimulateInfo.length === 0) {
      await vscode.window.showInformationMessage('No debug configurations found. Do you have desktop builds enabled?', {
        modal: true,
      });
      return false;
    }
    let targetSimulateInfo = parsedSimulateInfo[0];
    if (parsedSimulateInfo.length > 1) {
      const arr: JavaQuickPick<IJavaSimulateInfo>[] = [];
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
      if (this.preferences.getPreferences(workspace).getSkipSelectSimulateExtension()) {
        for (const e of targetSimulateInfo.extensions) {
          if (e.defaultEnabled) {
            extensions += e.libName;
            extensions += path.delimiter;
          }
        }
      } else {
        const extList = [];
        for (const e of targetSimulateInfo.extensions) {
          extList.push({
            label: e.name,
            path: e.libName,
            picked: e.defaultEnabled,
          });
        }
        const quickPick = await vscode.window.showQuickPick(extList, {
          canPickMany: true,
          placeHolder: 'Pick extensions to run',
        });
        if (quickPick === undefined) {
          vscode.window.showInformationMessage('Simulation cancelled');
          return false;
        }
        for (const qp of quickPick) {
          extensions += qp.path;
          extensions += path.delimiter;
        }
      }
    }

    const config: ISimulateCommands = {
      environment: targetSimulateInfo.environment,
      extensions,
      librarydir: targetSimulateInfo.libraryDir,
      mainclass: targetSimulateInfo.mainClassName,
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
