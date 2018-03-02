'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';
import { IPreferences, ILanguageSpecific } from './shared/externalapi';

interface PreferencesJson {
  teamNumber: number;
  currentLanguage: string;
  autoStartRioLog: boolean;
  autoSaveOnDeploy: boolean;
  languageSpecific : ILanguageSpecific[];
}

const defaultPreferences: PreferencesJson = {
  teamNumber: -1,
  currentLanguage: 'none',
  autoStartRioLog: false,
  autoSaveOnDeploy: true,
  languageSpecific: []
};

export async function requestTeamNumber(): Promise<number> {
  let teamNumber = await vscode.window.showInputBox( { prompt: 'Enter your team number'});
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

  constructor(workspace: vscode.WorkspaceFolder) {
    this.workspace = workspace;
    this.configFolder = path.join(workspace.uri.fsPath, '.wpilib');

    let configFilePath = path.join(this.configFolder, this.preferenceFileName);

    if (fs.existsSync(configFilePath)) {
      this.preferencesFile = vscode.Uri.file(configFilePath);
      this.preferencesJson = defaultPreferences;
      this.updatePreferences();
    } else {
      // Set up defaults, and create
      this.preferencesJson = defaultPreferences;
    }

    let rp = new vscode.RelativePattern(workspace, this.preferencesGlob);

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

    let results = fs.readFileSync(this.preferencesFile.fsPath, 'utf8');
    this.preferencesJson = jsonc.parse(results);
  }

  private writePreferences() {
    if (this.preferencesFile === undefined) {
      let configFilePath = path.join(this.configFolder, this.preferenceFileName);
      this.preferencesFile = vscode.Uri.file(configFilePath);
      fs.mkdirSync(path.dirname(this.preferencesFile.fsPath));
    }
    fs.writeFileSync(this.preferencesFile.fsPath, JSON.stringify(this.preferencesJson, null, 4));
  }

  private async noTeamNumberLogic(): Promise<number> {
    // Ask if user wants to set team number.
    let teamRequest = await vscode.window.showInformationMessage('No team number, would you like to input one?', 'Yes', 'Yes and Save', 'No');
    if (teamRequest === undefined) {
      return -1;
    }
    if (teamRequest === 'No') {
      return -1;
    }
    let teamNumber = await requestTeamNumber();
    if (teamNumber !== -1 && teamRequest === 'Yes and Save') {
      await this.setTeamNumber(teamNumber);
    }
    return teamNumber;
  }

  public async getTeamNumber(): Promise<number> {
    if (this.preferencesJson.teamNumber === -1) {
      return await this.noTeamNumberLogic();
    }

    return this.preferencesJson.teamNumber;
  }

  public setTeamNumber(teamNumber: number): void {
    this.preferencesJson.teamNumber = teamNumber;
    this.writePreferences();
  }

  public getCurrentLanguage(): string {
    return this.preferencesJson.currentLanguage;
  }

  public setCurrentLanguage(language: string): void {
    this.preferencesJson.currentLanguage = language;
    this.writePreferences();
  }

  public getAutoStartRioLog(): boolean {
    return this.preferencesJson.autoStartRioLog;
  }

  public setAutoStartRioLog(autoStart: boolean): void {
    this.preferencesJson.autoStartRioLog = autoStart;
    this.writePreferences();
  }

  public getLanguageSpecific(language: string): ILanguageSpecific | undefined {
    for (let l of this.preferencesJson.languageSpecific) {
      if (l.languageName === language) {
        return l;
      }
    }

    return undefined;
  }

  public setLanguageSpecific(data: ILanguageSpecific): void {
    for (let l of this.preferencesJson.languageSpecific) {
      if (l.languageName === data.languageName) {
        l.languageData = data.languageData;
        this.writePreferences();
        return;
      }
    }
    this.preferencesJson.languageSpecific.push(data);
    this.writePreferences();
  }

  public getAutoSaveOnDeploy(): boolean {
    return this.preferencesJson.autoSaveOnDeploy;
  }

  public setAutoSaveOnDeploy(autoSave: boolean): void {
    this.preferencesJson.autoSaveOnDeploy = autoSave;
    this.writePreferences();
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
