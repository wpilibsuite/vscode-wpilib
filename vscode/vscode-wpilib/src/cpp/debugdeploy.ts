'use strict';

import * as vscode from 'vscode';
import { gradleRun, parseGradleOutput } from '../shared/gradle';
import { IDeployDebugAPI, IPreferencesAPI, ICodeDeployer } from '../shared/externalapi';
import { ExternalEditorConfig } from './cppgradleproperties';
import * as path from 'path';
import { CppPreferences } from './cpppreferences';
import { DebugCommands, startDebugging } from './debug';
import { PropertiesStore } from './propertiesstore';

class DebugCodeDeployer implements ICodeDeployer {
  private preferences: IPreferencesAPI;
  private gradleChannel: vscode.OutputChannel;
  private propertiesStore: PropertiesStore;

  constructor(preferences: IPreferencesAPI, gradleChannel: vscode.OutputChannel, propStore: PropertiesStore) {
    this.preferences = preferences;
    this.gradleChannel = gradleChannel;
    this.propertiesStore = propStore;
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
    const command = 'deploy --offline -PdebugMode -PteamNumber=' + teamNumber;
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
    const parsed = parseGradleOutput(result);

    let cfg: ExternalEditorConfig | undefined = undefined;

    for (const p of this.propertiesStore.getGradleProperties()) {
      if (p.workspace.uri === workspace.uri) {
        await p.forceReparse();
        cfg = p.getLastConfig();
      }
    }

    if (cfg === undefined) {
      console.log('debugging failed');
      vscode.window.showInformationMessage('Debugging failed');
      return false;
    }


    let soPath = '';

    for (const p of cfg.component.libSharedFilePaths) {
      soPath += path.dirname(p) + ';';
    }

    soPath = soPath.substring(0, soPath.length - 1);

    let sysroot = '';

    if (cfg.compiler.sysroot !== null) {
      sysroot = cfg.compiler.sysroot;
    }

    const config: DebugCommands = {
      serverAddress: parsed.ip,
      serverPort: parsed.port,
      sysroot: sysroot,
      executablePath: cfg.component.launchfile,
      workspace: workspace,
      soLibPath: soPath,
      additionalCommands: []
    };

    let cppPref: CppPreferences | undefined = undefined;

    for (const c of this.propertiesStore.getCppPreferences()) {
      if (c.workspace.uri === workspace.uri) {
        cppPref = c;
      }
    }

    if (cppPref !== undefined) {
      config.additionalCommands = cppPref.getAdditionalDebugCommands();
    }

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
    return currentLanguage === 'none' || currentLanguage === 'cpp';
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
    return 'cpp';
  }
  public getDescription(): string {
    return 'C++ Deployment';
  }
}

export class DebugDeploy {
  private debugDeployer: DebugCodeDeployer;
  private deployDeployer: DeployCodeDeployer;


  constructor(debugDeployApi: IDeployDebugAPI, preferences: IPreferencesAPI, gradleChannel: vscode.OutputChannel, propStore: PropertiesStore, allowDebug: boolean) {
    debugDeployApi = debugDeployApi;
    debugDeployApi.addLanguageChoice('cpp');

    this.debugDeployer = new DebugCodeDeployer(preferences, gradleChannel, propStore);
    this.deployDeployer = new DeployCodeDeployer(preferences, gradleChannel);

    debugDeployApi.registerCodeDeploy(this.deployDeployer);

    if (allowDebug) {
      debugDeployApi.registerCodeDebug(this.debugDeployer);
    }
  }

  public dispose() {

  }
}
