'use strict';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IPreferences } from 'vscode-wpilibapi';
import { localize as i18n } from './locale';
import { IPreferencesJson } from './shared/preferencesjson';
import { existsAsync, mkdirAsync, readFileAsync, writeFileAsync } from './utilities';

const defaultPreferences: IPreferencesJson = {
  currentLanguage: 'none',
  enableCppIntellisense: false,
  projectYear: 'none',
  teamNumber: -1,
};

export async function requestTeamNumber(): Promise<number> {
  const teamNumber = await vscode.window.showInputBox({
    prompt: i18n('ui', 'Enter a team number'),
    validateInput: (v) => {
      const match = v.match(/^\d{1,5}$/gm);
      if (match === null || match.length === 0) {
        return i18n('ui', 'Invalid team number');
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
  public static readonly preferenceFileName: string = 'wpilib_preferences.json';
  public static readonly wpilibPreferencesFolder: string = '.wpilib';

  // Create for a specific workspace
  public static async Create(workspace: vscode.WorkspaceFolder): Promise<Preferences> {
    const prefs = new Preferences(workspace);
    await prefs.asyncInitialize();
    return prefs;
  }

  public static getPrefrencesFilePath(root: string): string {
    return path.join(root, Preferences.wpilibPreferencesFolder, Preferences.preferenceFileName);
  }

  // Workspace these preferences are assigned to.
  public workspace: vscode.WorkspaceFolder;

  private preferencesFile?: vscode.Uri;
  private preferencesJson: IPreferencesJson = defaultPreferences;
  private configFileWatcher: vscode.FileSystemWatcher;
  private readonly preferencesGlob: string = '**/' + Preferences.preferenceFileName;
  private disposables: vscode.Disposable[] = [];
  private isWPILibProject: boolean = false;

  private constructor(workspace: vscode.WorkspaceFolder) {
    this.workspace = workspace;

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
    if (this.preferencesJson.teamNumber < 0) {
      return this.noTeamNumberLogic();
    }
    return this.preferencesJson.teamNumber;
  }

  public async setTeamNumber(teamNumber: number): Promise<void> {
    this.preferencesJson.teamNumber = teamNumber;
    await this.writePreferences();
  }

  public getCurrentLanguage(): string {
    return this.preferencesJson.currentLanguage;
  }

  public getEnableCppIntellisense(): boolean {
    return this.preferencesJson.enableCppIntellisense;
  }

  public async setEnableCppIntellisense(set: boolean): Promise<void> {
    this.preferencesJson.enableCppIntellisense = set;
    await this.writePreferences();
  }

  public getProjectYear(): string {
    return this.preferencesJson.projectYear;
  }

  public async setProjectYear(year: string): Promise<void> {
    this.preferencesJson.projectYear = year;
    await this.writePreferences();
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

  public async setOffline(value: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('offline', value, target);
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

  public async setSkipSelectSimulateExtension(value: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('skipSelectSimulateExtension', value, target);
  }

  public async setSelectDefaultSimulateExtension(value: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('selectDefaultSimulateExtension', value, target);
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

  public getAdditionalGradleArguments(): string {
    const res = this.getConfiguration().get<string>('additionalGradleArguments');
    if (res === undefined) {
      return '';
    }
    return res;
  }

  public getOffline(): boolean {
    const res = this.getConfiguration().get<boolean>('offline');
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

  public getSkipSelectSimulateExtension(): boolean {
    const res = this.getConfiguration().get<boolean>('skipSelectSimulateExtension');
    if (res === undefined) {
      return false;
    }
    return res;
  }

  public getSelectDefaultSimulateExtension(): boolean {
    const res = this.getConfiguration().get<boolean>('selectDefaultSimulateExtension');
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

  public async setDeployOffline(value: boolean, global: boolean): Promise<void> {
    let target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global;
    if (!global) {
      target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    return this.getConfiguration().update('deployOffline', value, target);
  }

  public getDeployOffline(): boolean {
    const res = this.getConfiguration().get<boolean>('deployOffline');
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
    const configFilePath = Preferences.getPrefrencesFilePath(this.workspace.uri.fsPath);

    if (await existsAsync(configFilePath)) {
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

    const results = await readFileAsync(this.preferencesFile.fsPath, 'utf8');
    this.preferencesJson = jsonc.parse(results) as IPreferencesJson;
  }

  private async writePreferences(): Promise<void> {
    if (this.preferencesFile === undefined) {
      const configFilePath = Preferences.getPrefrencesFilePath(this.workspace.uri.fsPath);
      this.preferencesFile = vscode.Uri.file(configFilePath);
      await mkdirAsync(path.dirname(this.preferencesFile.fsPath));
    }
    await writeFileAsync(this.preferencesFile.fsPath, JSON.stringify(this.preferencesJson, null, 4));
  }

  private async noTeamNumberLogic(): Promise<number> {
    // Ask if user wants to set team number.
    const teamRequest = await vscode.window.showInformationMessage(i18n('message', 'No team number, would you like to save one?'), {
      modal: true,
    }, i18n('ui', 'Yes'), i18n('ui', 'No'));
    if (teamRequest === undefined) {
      return -1;
    }
    const teamNumber = await requestTeamNumber();
    if (teamRequest === i18n('ui', 'No')) {
      return teamNumber;
    } else if (teamNumber >= 0) {
      await this.setTeamNumber(teamNumber);
    }
    return teamNumber;
  }
}
