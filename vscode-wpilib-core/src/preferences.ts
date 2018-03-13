'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { IPreferences } from './shared/externalapi';
import { ConfigurationTarget } from 'vscode';

interface PreferencesJson {
  teamNumber: number;
  currentLanguage: string;
}

const defaultPreferences: PreferencesJson = {
  teamNumber: -1,
  currentLanguage: 'none',
};

export async function requestTeamNumber(): Promise<number> {
  const teamNumber = await vscode.window.showInputBox( { prompt: 'Enter your team number'});
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
  public configuration: vscode.WorkspaceConfiguration;

  constructor(workspace: vscode.WorkspaceFolder) {
    this.workspace = workspace;
    this.configFolder = path.join(workspace.uri.fsPath, '.wpilib');

    this.configuration = vscode.workspace.getConfiguration('wpilib', this.workspace.uri);

    const configFilePath = path.join(this.configFolder, this.preferenceFileName);

    if (fs.existsSync(configFilePath)) {
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
      this.preferencesFile = uri;
      this.updatePreferences();
    });

    this.configFileWatcher.onDidDelete(() => {
      this.preferencesFile = undefined;
      this.updatePreferences();
    });

    this.configFileWatcher.onDidChange(() => {
      this.updatePreferences();
    });

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
    const teamRequest = await vscode.window.showInformationMessage('No team number, would you like to save one?', 'Yes (Globally)', 'Yes (Project)', 'No');
    if (teamRequest === undefined) {
      return -1;
    }
    const teamNumber = await requestTeamNumber();
    if (teamRequest === 'No') {
      return teamNumber;
    }
    if (teamNumber !== -1 && teamRequest === 'Yes (Globally)') {
      await this.setTeamNumber(teamNumber, true);
    } else if (teamNumber !== -1 && teamRequest === 'Yes (Project)') {
      await this.setTeamNumber(teamNumber, false);
    }
    return teamNumber;
  }

  public async getTeamNumber(): Promise<number> {
    // If always ask, get it.
    const alwaysAsk = this.configuration.get<boolean>('alwaysAskForTeamNumber');
    if (alwaysAsk !== undefined && alwaysAsk === true) {
      const teamNumber = await vscode.window.showInputBox( { prompt: 'Enter your team number'});
      if (teamNumber === undefined) {
        return -1;
      }
      return parseInt(teamNumber);
    }
    if (this.preferencesJson.teamNumber === -1) {
      // Check global preferences
      const res = this.configuration.get<number>('globalTeamNumber');
      if (res === undefined || res < 0) {
        return await this.noTeamNumberLogic();
      }
      return res;
    }

    return this.preferencesJson.teamNumber;
  }

  public setTeamNumber(teamNumber: number, global: boolean): void {
    if (global) {
      this.configuration.update('globalTeamNumber', teamNumber, ConfigurationTarget.Global);
    } else {
      this.preferencesJson.teamNumber = teamNumber;
      this.writePreferences();
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
    const res = this.configuration.get<boolean>('autoStartRioLog');
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
    this.configuration.update('autoStartRioLog', autoStart, target);
  }

  public getAutoSaveOnDeploy(): boolean {
    const res = this.configuration.get<boolean>('autoSaveOnDeploy');
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
    this.configuration.update('autoSaveOnDeploy', autoSave, target);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
