'use strict';

import * as vscode from 'vscode';
import { gradleRun } from '../shared/gradle';
import { IDeployDebugAPI, IPreferencesAPI, ICodeDeployer } from '../shared/externalapi';
import { readFileAsync } from '../utilities';
import * as path from 'path';
import * as jsonc from 'jsonc-parser';
import { DebugCommands, startDebugging } from './debug';

interface CppDebugInfo {
  debugfile: string;
  artifact: string;
}

interface CppDebugCommand {
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

  public debugInfo: CppDebugInfo;

  public constructor(debugInfo: CppDebugInfo) {
    this.debugInfo = debugInfo;
    this.label = debugInfo.artifact;
  }
}

//import { DebugCommands, startDebugging } from './debug';
class DebugCodeDeployer implements ICodeDeployer {
  private preferences: IPreferencesAPI;

  constructor(preferences: IPreferencesAPI) {
    this.preferences = preferences;
  }

  public async getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const prefs = await this.preferences.getPreferences(workspace);
    if (prefs === undefined) {
      console.log('Preferences without workspace?');
      return false;
    }
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'deploy -PdebugMode -PteamNumber=' + teamNumber;
    if (workspace === undefined) {
      vscode.window.showInformationMessage('No workspace selected');
      return false;
    }
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, false);
    if (result === 0) {
    } else {
      return false;
    }

    const debugInfo = await readFileAsync(path.join(workspace.uri.fsPath, 'build', 'debug', 'debuginfo.json'));
    const parsedDebugInfo: CppDebugInfo[] = jsonc.parse(debugInfo);
    let targetDebugInfo = parsedDebugInfo[0];
    if (parsedDebugInfo.length > 1) {
      const arr: CppDebugQuickPick[] = [];
      for (const i of parsedDebugInfo) {
        arr.push(new CppDebugQuickPick(i));
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
    const targetInfoParsed: CppDebugCommand = jsonc.parse(targetReadInfo);

    let soPath = '';

    for (const p of targetInfoParsed.sofiles) {
      soPath += path.dirname(p) + ';';
    }

    soPath = soPath.substring(0, soPath.length - 1);

    let sysroot = '';

    if (targetInfoParsed.sysroot !== null) {
      sysroot = targetInfoParsed.sysroot;
    }

    const config: DebugCommands = {
      target: targetInfoParsed.target,
      sysroot: sysroot,
      executablePath: targetInfoParsed.launchfile,
      workspace: workspace,
      soLibPath: soPath,
      gdbPath: targetInfoParsed.gdb,
      headerPaths: targetInfoParsed.headerpaths,
      libSrcPaths: targetInfoParsed.libsrcpaths,
      srcPaths: targetInfoParsed.srcpaths
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
    const prefs = await this.preferences.getPreferences(workspace);
    if (prefs === undefined) {
      console.log('Preferences without workspace?');
      return false;
    }
    const currentLanguage = prefs.getCurrentLanguage();
    return currentLanguage === 'none' || currentLanguage === 'cpp';
  }
  public async runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const command = 'deploy -PteamNumber=' + teamNumber;
    if (workspace === undefined) {
      vscode.window.showInformationMessage('No workspace selected');
      return false;
    }
    const result = await gradleRun(command, workspace.uri.fsPath, workspace, false);
    if (result === 0) {
    } else {
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

  public dispose() {

  }
}
