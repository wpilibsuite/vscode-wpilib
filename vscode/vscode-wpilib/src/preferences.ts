'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { IPreferences } from './shared/externalapi';
import { ConfigurationTarget } from 'vscode';

interface PreferencesJson {
  currentLanguage: string;
}

const defaultPreferences: PreferencesJson = {
  currentLanguage: 'none',
};

export async function requestTeamNumber(): Promise<number> {
  const teamNumber = await vscode.window.showInputBox({ prompt: 'Enter your team number' });
  if (teamNumber === undefined) {
    return -1;
  }
  return parseInt(teamNumber);
}

export class Preferences implements IPreferences {
  private preferencesFile?: vscode.Uri;
  private readonly configFolder: string;
  private readonly preferenceFileName: string = 'wpilib_preferences.json';
  private preferencesJson: PreferencesJson;
  private configFileWatcher: vscode.FileSystemWatcher;
  private readonly preferencesGlob: string = '**/' + this.preferenceFileName;
  private disposables: vscode.Disposable[] = [];
  public workspace: vscode.WorkspaceFolder;
  private isWPILibProject: boolean = false;

  constructor(workspace: vscode.WorkspaceFolder) {
    this.workspace = workspace;
    this.configFolder = path.join(workspace.uri.fsPath, '.wpilib');

    const configFilePath = path.join(this.configFolder, this.preferenceFileName);

    if (fs.existsSync(configFilePath)) {
      vscode.commands.executeCommand('setContext', 'isWPILibProject', true);
      this.isWPILibProject = true;
      this.preferencesFile = vscode.Uri.file(configFilePath);
      this.preferencesJson = defaultPreferences;
      this.updatePreferences();
    } else {
      // Set up defaults, and create
      this.preferencesJson = defaultPreferences;
    }

    const rp = new vscode.RelativePattern(workspace, this.preferencesGlob);

    this.configFileWatcher = vscode.workspace.createFileSystemWatcher(rp);
    this.disposables.push(this.configFileWatcher);

    this.configFileWatcher.onDidCreate((uri) => {
      vscode.commands.executeCommand('setContext', 'isWPILibProject', true);
      this.isWPILibProject = true;
      this.preferencesFile = uri;
      this.updatePreferences();
    });

    this.configFileWatcher.onDidDelete(() => {
      vscode.commands.executeCommand('setContext', 'isWPILibProject', false);
      this.isWPILibProject = false;
      this.preferencesFile = undefined;
      this.updatePreferences();
    });

    this.configFileWatcher.onDidChange(() => {
      this.updatePreferences();
    });

  }

  public getIsWPILibProject(): boolean {
    return this.isWPILibProject;
  }

  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('wpilib', this.workspace.uri);
  }

  private updatePreferences() {
    if (this.preferencesFile === undefined) {
      this.preferencesJson = defaultPreferences;
      return;
    }

    const results = fs.readFileSync(this.preferencesFile.fsPath, 'utf8');
    this.preferencesJson = jsonc.parse(results);
  }

  private writePreferences() {
    if (this.preferencesFile === undefined) {
      const configFilePath = path.join(this.configFolder, this.preferenceFileName);
      this.preferencesFile = vscode.Uri.file(configFilePath);
      fs.mkdirSync(path.dirname(this.preferencesFile.fsPath));
    }
    fs.writeFileSync(this.preferencesFile.fsPath, JSON.stringify(this.preferencesJson, null, 4));
  }

  private async noTeamNumberLogic(): Promise<number> {
    // Ask if user wants to set team number.
    const teamRequest = await vscode.window.showInformationMessage('No team number, would you like to save one?', 'Yes (Globally)', 'Yes (Workspace)', 'No');
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

  public async getTeamNumber(): Promise<number> {
    // If always ask, get it.
    const alwaysAsk = this.getConfiguration().get<boolean>('alwaysAskForTeamNumber');
    if (alwaysAsk !== undefined && alwaysAsk === true) {
      return await requestTeamNumber();
    }
    const res = this.getConfiguration().get<number>('teamNumber');
    if (res === undefined || res < 0) {
      return await this.noTeamNumberLogic();
    }
    return res;
  }

  public async setTeamNumber(teamNumber: number, global: boolean): Promise<void> {
    try {
      if (global) {
        await this.getConfiguration().update('teamNumber', teamNumber, ConfigurationTarget.Global);
      } else {
        await this.getConfiguration().update('teamNumber', teamNumber, ConfigurationTarget.WorkspaceFolder);
      }
    } catch (err) {
      console.log('error setting team number', err);
    }
  }

  public getCurrentLanguage(): string {
    return this.preferencesJson.currentLanguage;
  }

  public setCurrentLanguage(language: string): void {
    this.preferencesJson.currentLanguage = language;
    this.writePreferences();
  }

  public getAutoStartRioLog(): boolean {
    const res = this.getConfiguration().get<boolean>('autoStartRioLog');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  public setAutoStartRioLog(autoStart: boolean, global: boolean): void {
    let target: vscode.ConfigurationTarget = ConfigurationTarget.Global;
    if (!global) {
      target = ConfigurationTarget.WorkspaceFolder;
    }
    this.getConfiguration().update('autoStartRioLog', autoStart, target);
  }

  public getAutoSaveOnDeploy(): boolean {
    const res = this.getConfiguration().get<boolean>('autoSaveOnDeploy');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  public setAutoSaveOnDeploy(autoSave: boolean, global: boolean): void {
    let target: vscode.ConfigurationTarget = ConfigurationTarget.Global;
    if (!global) {
      target = ConfigurationTarget.WorkspaceFolder;
    }
    this.getConfiguration().update('autoSaveOnDeploy', autoSave, target);
  }

  public getOnline(): boolean {
    const res = this.getConfiguration().get<boolean>('online');
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
}
