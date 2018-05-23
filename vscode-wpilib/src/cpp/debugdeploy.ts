'use strict';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { ICodeDeployer, IDeployDebugAPI, IPreferencesAPI } from '../shared/externalapi';
import { gradleRun } from '../shared/gradle';
import { readFileAsync } from '../utilities';
import { IDebugCommands, startDebugging } from './debug';

interface ICppDebugInfo {
  debugfile: string;
  artifact: string;
}

interface ICppDebugCommand {
  launchfile: string;
  target: string;
  gdb: string;
  sysroot: string | null;
  srcpaths: string[];
  headerpaths: string[];
  sofiles: string[];
  libsrcpaths: string[];
}

class CppDebugQuickPick implements vscode.QuickPickItem {
  public label: string;
  public description?: string | undefined;
  public detail?: string | undefined;
  public picked?: boolean | undefined;

  public debugInfo: ICppDebugInfo;

  public constructor(debugInfo: ICppDebugInfo) {
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
    const prefs = this.preferences.getPreferences(workspace);
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'deploy -PdebugMode -PteamNumber=' + teamNumber;
    const online = this.preferences.getPreferences(workspace).getOnline();
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online);
    if (result !== 0) {
      return false;
    }

    const debugInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'debuginfo.json'));
    const parsedDebugInfo: ICppDebugInfo[] = jsonc.parse(debugInfo) as ICppDebugInfo[];
    let targetDebugInfo = parsedDebugInfo[0];
    if (parsedDebugInfo.length > 1) {
      const arr: CppDebugQuickPick[] = [];
      for (const i of parsedDebugInfo) {
        arr.push(new CppDebugQuickPick(i));
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

    let soPath = '';

    for (const p of targetInfoParsed.sofiles) {
      soPath += path.dirname(p) + ';';
    }

    soPath = soPath.substring(0, soPath.length - 1);

    let sysroot = '';

    if (targetInfoParsed.sysroot !== null) {
      sysroot = targetInfoParsed.sysroot;
    }

    const config: IDebugCommands = {
      executablePath: targetInfoParsed.launchfile,
      gdbPath: targetInfoParsed.gdb,
      headerPaths: targetInfoParsed.headerpaths,
      libSrcPaths: targetInfoParsed.libsrcpaths,
      soLibPath: soPath,
      srcPaths: targetInfoParsed.srcpaths,
      sysroot,
      target: targetInfoParsed.target,
      workspace,
    };

    await startDebugging(config);

    console.log(result);
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

  constructor(preferences: IPreferencesAPI) {
    this.preferences = preferences;
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = this.preferences.getPreferences(workspace);
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'deploy -PteamNumber=' + teamNumber;
    const online = this.preferences.getPreferences(workspace).getOnline();
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, online);
    if (result !== 0) {
      return false;
    }
    console.log(result);
    return true;
  }
  public getDisplayName(): string {
    return 'cpp';
  }
  public getDescription(): string {
    return 'C++ Deployment';
  }
}

export class DebugDeploy {
  private debugDeployer: DebugCodeDeployer;
  private deployDeployer: DeployCodeDeployer;

  constructor(debugDeployApi: IDeployDebugAPI, preferences: IPreferencesAPI, allowDebug: boolean) {
    debugDeployApi = debugDeployApi;
    debugDeployApi.addLanguageChoice('cpp');

    this.debugDeployer = new DebugCodeDeployer(preferences);
    this.deployDeployer = new DeployCodeDeployer(preferences);

    debugDeployApi.registerCodeDeploy(this.deployDeployer);

    if (allowDebug) {
      debugDeployApi.registerCodeDebug(this.debugDeployer);
    }
  }

  // tslint:disable-next-line:no-empty
  public dispose() {

  }
}
