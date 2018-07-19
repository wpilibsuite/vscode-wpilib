'use strict';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IPreferences } from './shared/externalapi';
import { promisifyExists, promisifyMkDir, promisifyReadFile, promisifyWriteFile } from './utilities';

interface IPreferencesJson {
  currentLanguage: string;
}

const defaultPreferences: IPreferencesJson = {
  currentLanguage: 'none',
};

export async function requestTeamNumber(): Promise<number> {
  const teamNumber = await vscode.window.showInputBox({
    prompt: 'Enter your team number',
    validateInput: (v) => {
      const match = v.match(/^\d{0,5}$/gm);
      if (match === null || match.length === 0) {
        return 'Invalid team number';
      }
      return undefined;
    },
  });
  if (teamNumber === undefined) {
    return -1;
  }
  return parseInt(teamNumber, 10);
}

// Stores the preferences for a specific workspace
export class Preferences implements IPreferences {
  // Create for a specific workspace
  public static async Create(workspace: vscode.WorkspaceFolder): Promise<Preferences> {
    const prefs = new Preferences(workspace);
    await prefs.asyncInitialize();
    return prefs;
  }

  // Workspace these preferences are assigned to.
  public workspace: vscode.WorkspaceFolder;

  private preferencesFile?: vscode.Uri;
  private readonly configFolder: string;
  private readonly preferenceFileName: string = 'wpilib_preferences.json';
  private preferencesJson: IPreferencesJson = defaultPreferences;
  private configFileWatcher: vscode.FileSystemWatcher;
  private readonly preferencesGlob: string = '**/' + this.preferenceFileName;
  private disposables: vscode.Disposable[] = [];
  private isWPILibProject: boolean = false;

  private constructor(workspace: vscode.WorkspaceFolder) {
    this.workspace = workspace;
    this.configFolder = path.join(workspace.uri.fsPath, '.wpilib');

    const rp = new vscode.RelativePattern(workspace, this.preferencesGlob);

    this.configFileWatcher = vscode.workspace.createFileSystemWatcher(rp);
    this.disposables.push(this.configFileWatcher);

    this.configFileWatcher.onDidCreate(async (uri) => {
      await vscode.commands.executeCommand('setContext', 'isWPILibProject', true);
      this.isWPILibProject = true;
      this.preferencesFile = uri;
      await this.updatePreferences();
    });

    this.configFileWatcher.onDidDelete(async () => {
      await vscode.commands.executeCommand('setContext', 'isWPILibProject', false);
      this.isWPILibProject = false;
      this.preferencesFile = undefined;
      await this.updatePreferences();
    });

    this.configFileWatcher.onDidChange(async () => {
      await this.updatePreferences();
    });
  }

  public getIsWPILibProject(): boolean {
    return this.isWPILibProject;
  }

  public async getTeamNumber(): Promise<number> {
    // If always ask, get it.
    const alwaysAsk = this.getConfiguration().get<boolean>('alwaysAskForTeamNumber');
    if (alwaysAsk !== undefined && alwaysAsk === true) {
      return requestTeamNumber();
    }
    const res = this.getConfiguration().get<number>('teamNumber');
    if (res === undefined || res < 0) {
      return this.noTeamNumberLogic();
    }
    return res;
  }

  public async setTeamNumber(teamNumber: number, global: boolean): Promise<void> {
    try {
      if (global) {
        await this.getConfiguration().update('teamNumber', teamNumber, vscode.ConfigurationTarget.Global);
      } else {
        await this.getConfiguration().update('teamNumber', teamNumber, vscode.ConfigurationTarget.WorkspaceFolder);
      }
    } catch (err) {
      console.log('error setting team number', err);
    }
  }

  public getCurrentLanguage(): string {
    return this.preferencesJson.currentLanguage;
  }

  public async setCurrentLanguage(language: string): Promise<void> {
    this.preferencesJson.currentLanguage = language;
    await this.writePreferences();
  }

  public getAutoStartRioLog(): boolean {
    const res = this.getConfiguration().get<boolean>('autoStartRioLog');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  public async setAutoStartRioLog(autoStart: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('autoStartRioLog', autoStart, target);
  }

  public async setOnline(value: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('online', value, target);
  }

  public async setStopSimulationOnEntry(value: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('stopSimulationOnEntry', value, target);
  }

  public async setSkipTests(value: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('skipTests', value, target);
  }

  public getAutoSaveOnDeploy(): boolean {
    const res = this.getConfiguration().get<boolean>('autoSaveOnDeploy');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  public async setAutoSaveOnDeploy(autoSave: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('autoSaveOnDeploy', autoSave, target);
  }

  public getOnline(): boolean {
    const res = this.getConfiguration().get<boolean>('online');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  public getSkipTests(): boolean {
    const res = this.getConfiguration().get<boolean>('skipTests');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  public getStopSimulationOnEntry(): boolean {
    const res = this.getConfiguration().get<boolean>('stopSimulationOnEntry');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async asyncInitialize() {
    const configFilePath = path.join(this.configFolder, this.preferenceFileName);

    if (await promisifyExists(configFilePath)) {
      vscode.commands.executeCommand('setContext', 'isWPILibProject', true);
      this.isWPILibProject = true;
      this.preferencesFile = vscode.Uri.file(configFilePath);
      this.preferencesJson = defaultPreferences;
      await this.updatePreferences();
    } else {
      // Set up defaults, and create
      this.preferencesJson = defaultPreferences;
    }
  }

  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('wpilib', this.workspace.uri);
  }

  private async updatePreferences() {
    if (this.preferencesFile === undefined) {
      this.preferencesJson = defaultPreferences;
      return;
    }

    const results = await promisifyReadFile(this.preferencesFile.fsPath);
    this.preferencesJson = jsonc.parse(results) as IPreferencesJson;
  }

  private async writePreferences(): Promise<void> {
    if (this.preferencesFile === undefined) {
      const configFilePath = path.join(this.configFolder, this.preferenceFileName);
      this.preferencesFile = vscode.Uri.file(configFilePath);
      await promisifyMkDir(path.dirname(this.preferencesFile.fsPath));
    }
    await promisifyWriteFile(this.preferencesFile.fsPath, JSON.stringify(this.preferencesJson, null, 4));
  }

  private async noTeamNumberLogic(): Promise<number> {
    // Ask if user wants to set team number.
    const teamRequest = await vscode.window.showInformationMessage('No team number, would you like to save one?',
      'Yes (Globally)', 'Yes (Workspace)', 'No');
    if (teamRequest === undefined) {
      return -1;
    }
    const teamNumber = await requestTeamNumber();
    if (teamRequest === 'No') {
      return teamNumber;
    }
    if (teamNumber !== -1 && teamRequest === 'Yes (Globally)') {
      await this.setTeamNumber(teamNumber, true);
    } else if (teamNumber !== -1 && teamRequest === 'Yes (Workspace)') {
      await this.setTeamNumber(teamNumber, false);
    }
    return teamNumber;
  }
}
