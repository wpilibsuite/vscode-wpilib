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
  debugfile: string;
  artifact: string;
}

interface ICppDebugCommand {
  name?: string;
  extensions?: string;
  clang?: boolean;
  launchfile: string;
  target: string;
  gdb: string;
  sysroot: string | null;
  srcpaths: string[];
  headerpaths: string[];
  libpaths: string[];
  debugpaths: string[];
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
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    let command = 'deploy -PdebugMode -PteamNumber=' + teamNumber;
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

    const debugInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'debuginfo.json'));
    const parsedDebugInfo: ICppDebugInfo[] = jsonc.parse(debugInfo) as ICppDebugInfo[];
    let targetDebugInfo = parsedDebugInfo[0];
    if (parsedDebugInfo.length > 1) {
      const arr: Array<CppQuickPick<ICppDebugInfo>> = [];
      for (const i of parsedDebugInfo) {
        arr.push(new CppQuickPick<ICppDebugInfo>(i, i.artifact));
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
    const targetInfoParsed: ICppDebugCommand = jsonc.parse(targetReadInfo) as ICppDebugCommand;

    const set = new Set<string>(targetInfoParsed.libpaths);

    let soPath = '';

    for (const p of set) {
      soPath += path.dirname(p) + ';';
    }

    soPath = soPath.substring(0, soPath.length - 1);

    let sysroot = '';

    if (targetInfoParsed.sysroot !== null) {
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
      target: targetInfoParsed.target,
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
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    let command = 'deploy -PteamNumber=' + teamNumber;
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
  public async runDeployer(_: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'simulateExternalCpp';
    const prefs = this.preferences.getPreferences(workspace);
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, 'C++ Simulate', this.executeApi, prefs);
    if (result !== 0) {
      return false;
    }

    const simulateInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'desktopinfo.json'));
    const parsedSimulateInfo: ICppDebugCommand[] = jsonc.parse(simulateInfo) as ICppDebugCommand[];
    let targetSimulateInfo = parsedSimulateInfo[0];
    if (parsedSimulateInfo.length > 1) {
      const arr: Array<CppQuickPick<ICppDebugCommand>> = [];
      for (const i of parsedSimulateInfo) {
        // tslint:disable-next-line:no-non-null-assertion
        arr.push(new CppQuickPick<ICppDebugCommand>(i, i.name!));
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
    // tslint:disable-next-line:no-non-null-assertion
    const targetExtensions = targetSimulateInfo.extensions!;
    if (targetExtensions.length > 0) {
      const extList = [];
      for (const e of targetExtensions) {
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

    if (!getIsWindows()) {
      const set = new Set<string>(targetSimulateInfo.debugpaths);

      let soPath = '';

      for (const p of set) {
        soPath += path.dirname(p) + ';';
      }

      soPath = soPath.substring(0, soPath.length - 1);

      const config: IUnixSimulateCommands = {
        // tslint:disable-next-line:no-non-null-assertion
        clang: targetSimulateInfo.clang!,
        executablePath: targetSimulateInfo.launchfile,
        extensions,
        soLibPath: soPath,
        srcPaths: new Set<string>(targetSimulateInfo.srcpaths),
        stopAtEntry: this.preferences.getPreferences(workspace).getStopSimulationOnEntry(),
        workspace,
      };

      await startUnixSimulation(config);
    } else {
      const config: IWindowsSimulateCommands = {
        debugPaths: targetSimulateInfo.debugpaths,
        extensions,
        launchfile: targetSimulateInfo.launchfile,
        srcPaths: targetSimulateInfo.srcpaths,
        stopAtEntry: this.preferences.getPreferences(workspace).getStopSimulationOnEntry(),
        workspace,
      };

      await startWindowsSimulation(config);
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
