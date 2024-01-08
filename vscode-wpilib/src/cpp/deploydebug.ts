'use strict';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICodeDeployer, IExecuteAPI, IExternalAPI, IPreferencesAPI } from 'vscode-wpilibapi';
import { getIsWindows, gradleRun, readFileAsync } from '../utilities';
import { IDebugCommands, startDebugging } from './debug';
import { IUnixSimulateCommands, startUnixSimulation } from './simulateunix';
import { IWindowsSimulateCommands, startWindowsSimulation } from './simulatewindows';

interface ICppDebugInfo {
  name: string;
  path: string;
}

interface ICppSimExtensions {
  name: string;
  libName: string;
  defaultEnabled: boolean;
}

interface ICppSimulateInfo {
  type: string;
  name: string;
  extensions: ICppSimExtensions[];
  launchfile: string;
  clang: boolean;
  environment?: { [key: string]: string };
  srcpaths: string[];
  headerpaths: string[];
  libpaths: string[];
  libsrcpaths: string[];
}

interface ICppDebugCommand {
  type: string;
  name: string;
  port: number;
  target: string;
  launchfile: string;
  gdb: string;
  sysroot: string | undefined;
  srcpaths: string[];
  headerpaths: string[];
  libpaths: string[];
  libsrcpaths: string[];
}

class CppQuickPick<T> implements vscode.QuickPickItem {
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
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder,
                           _: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    let command = 'deploy ' + args.join(' ') + ' -PdebugMode -PteamNumber=' + teamNumber;
    const prefs = this.preferences.getPreferences(workspace);
    // If deploy offline, and builds online, set flags
    // Otherwise, build offline will be set later
    if (prefs.getDeployOffline() && !prefs.getOffline()) {
      command += ' --offline';
    }
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'C++ Debug', this.executeApi, prefs);
    if (result !== 0) {
      return false;
    }

    const debugInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'debug_info.json'), 'utf8');
    const parsedDebugInfo: ICppDebugInfo[] = jsonc.parse(debugInfo) as ICppDebugInfo[];
    if (parsedDebugInfo.length === 0) {
      await vscode.window.showInformationMessage('No target configurations found. Is this a robot project?', {
        modal: true,
      });
      return false;
    }
    let targetDebugInfo = parsedDebugInfo[0];
    if (parsedDebugInfo.length > 1) {
      const arr: CppQuickPick<ICppDebugInfo>[] = [];
      for (const i of parsedDebugInfo) {
        arr.push(new CppQuickPick<ICppDebugInfo>(i, i.name));
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
    const targetInfoArray: ICppDebugCommand[] = jsonc.parse(targetReadInfo) as ICppDebugCommand[];

    if (targetInfoArray.length === 0) {
      await vscode.window.showInformationMessage('No debug configurations found. Is this a robot project?', {
        modal: true,
      });
      return false;
    }

    // TODO Filter this off of type
    let targetInfoParsed = targetInfoArray[0];
    if (targetInfoArray.length > 1) {
      const arr: CppQuickPick<ICppDebugCommand>[] = [];
      for (const i of targetInfoArray) {
        arr.push(new CppQuickPick<ICppDebugCommand>(i, i.name));
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

    const set = new Set<string>(targetInfoParsed.libpaths);

    let soPath = '';

    for (const p of set) {
      soPath += path.dirname(p) + ';';
    }

    soPath = soPath.substring(0, soPath.length - 1);

    let sysroot = '';

    if (targetInfoParsed.sysroot !== undefined) {
      sysroot = targetInfoParsed.sysroot;
    }

    const srcArrs = [];
    srcArrs.push(...targetInfoParsed.srcpaths);
    srcArrs.push(...targetInfoParsed.headerpaths);
    srcArrs.push(...targetInfoParsed.libsrcpaths);

    const config: IDebugCommands = {
      executablePath: targetInfoParsed.launchfile,
      gdbPath: targetInfoParsed.gdb,
      soLibPath: soPath,
      srcPaths: new Set<string>(srcArrs),
      sysroot,
      target: targetInfoParsed.target + ':' + targetInfoParsed.port.toString(10),
      workspace,
    };

    await startDebugging(config);
    return true;
  }
  public getDisplayName(): string {
    return 'cpp';
  }
  public getDescription(): string {
    return 'C++ Debugging';
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
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder,
                           _: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    let command = 'deploy ' + args.join(' ') + ' -PteamNumber=' + teamNumber;
    const prefs = this.preferences.getPreferences(workspace);
    // If deploy offline, and builds online, set flags
    // Otherwise, build offline will be set later
    if (prefs.getDeployOffline() && !prefs.getOffline()) {
      command += ' --offline';
    }
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'C++ Deploy', this.executeApi, prefs);
    if (result !== 0) {
      return false;
    }
    return true;
  }
  public getDisplayName(): string {
    return 'cpp';
  }
  public getDescription(): string {
    return 'C++ Deployment';
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
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }
  public async runDeployer(_: number, workspace: vscode.WorkspaceFolder,
                           __: vscode.Uri | undefined, ...args: string[]): Promise<boolean> {
    // Support release
    const command = 'simulateExternalNativeDebug ' + args.join(' ');
    const prefs = this.preferences.getPreferences(workspace);
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'C++ Simulate', this.executeApi, prefs);
    if (result !== 0) {
      return false;
    }

    const simulateInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'sim', 'debug_native.json'), 'utf8');
    const parsedSimulateInfo: ICppSimulateInfo[] = jsonc.parse(simulateInfo) as ICppSimulateInfo[];
    if (parsedSimulateInfo.length === 0) {
      await vscode.window.showInformationMessage('No debug configurations found. Do you have desktop builds enabled?', {
        modal: true,
      });
      return false;
    }
    let targetSimulateInfo = parsedSimulateInfo[0];
    if (parsedSimulateInfo.length > 1) {
      const arr: CppQuickPick<ICppSimulateInfo>[] = [];
      for (const i of parsedSimulateInfo) {
        arr.push(new CppQuickPick<ICppSimulateInfo>(i, i.name));
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
        if (quickPick !== undefined) {
          for (const qp of quickPick) {
            extensions += qp.path;
            extensions += path.delimiter;
          }
        }
      }
    }

    if (!getIsWindows()) {
      const set = new Set<string>(targetSimulateInfo.libpaths);

      let soPath = '';

      for (const p of set) {
        soPath += path.dirname(p) + ';';
      }

      soPath = soPath.substring(0, soPath.length - 1);

      const config: IUnixSimulateCommands = {
        clang: targetSimulateInfo.clang,
        environment: targetSimulateInfo.environment,
        executablePath: targetSimulateInfo.launchfile,
        extensions,
        ldPath: path.dirname(targetSimulateInfo.launchfile),    // gradle puts all the libs in the same dir as the executable
        soLibPath: soPath,
        srcPaths: new Set<string>(targetSimulateInfo.srcpaths),
        stopAtEntry: this.preferences.getPreferences(workspace).getStopSimulationOnEntry(),
        workspace,
      };

      await startUnixSimulation(config);
    } else {
      const config: IWindowsSimulateCommands = {
        debugPaths: targetSimulateInfo.libpaths,
        environment: targetSimulateInfo.environment,
        extensions,
        launchfile: targetSimulateInfo.launchfile,
        srcPaths: targetSimulateInfo.srcpaths,
        stopAtEntry: this.preferences.getPreferences(workspace).getStopSimulationOnEntry(),
        workspace,
      };

      await startWindowsSimulation(config, this.executeApi);
    }
    return true;
  }
  public getDisplayName(): string {
    return 'cpp';
  }
  public getDescription(): string {
    return 'C++ Simulation';
  }
}

export class DeployDebug {
  private deployDebuger: DebugCodeDeployer;
  private deployDeployer: DeployCodeDeployer;
  private simulator: SimulateCodeDeployer;

  constructor(externalApi: IExternalAPI, allowDebug: boolean) {
    const deployDebugApi = externalApi.getDeployDebugAPI();
    deployDebugApi.addLanguageChoice('cpp');

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
