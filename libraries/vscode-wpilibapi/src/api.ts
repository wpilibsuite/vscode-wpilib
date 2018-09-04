'use strict';
import * as vscode from 'vscode';

export interface IPreferencesChangedPair {
  workspace: vscode.WorkspaceFolder;
  preference: IPreferences;
}

export interface ICreatorQuickPick extends vscode.QuickPickItem {
  creator: IExampleTemplateCreator;
}

export interface IToolAPI {
  startTool(): Promise<boolean>;
  addTool(tool: IToolRunner): void;
}

export interface IExecuteAPI {
  executeCommand(command: string, name: string, rootDir: string, workspace: vscode.WorkspaceFolder): Promise<number>;
  cancelCommands(): Promise<number>;
}

export interface IExampleTemplateAPI {
  addTemplateProvider(provider: IExampleTemplateCreator): void;
  addExampleProvider(provider: IExampleTemplateCreator): void;
  getLanguages(template: boolean): string[];
  getBases(template: boolean, language: string): ICreatorQuickPick[];
  createProject(template: boolean, language: string, base: string, toFolder: string,
                newFolder: boolean, projectName: string, teamNumber: number): Promise<boolean>;
}

export interface ICommandAPI {
  addCommandProvider(provider: ICommandCreator): void;
  createCommand(workspace: vscode.WorkspaceFolder, folder: vscode.Uri): Promise<boolean>;
}

export interface IDeployDebugAPI {
  startRioLog(teamNumber: number, show: boolean): Promise<boolean>;
  deployCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  registerCodeDeploy(deployer: ICodeDeployer): void;
  debugCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  registerCodeDebug(deployer: ICodeDeployer): void;
  simulateCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  registerCodeSimulate(deployer: ICodeDeployer): void;
  addLanguageChoice(language: string): void;
  getLanguageChoices(): string[];
}

export interface IBuildTestAPI {
  buildCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  registerCodeBuild(builder: ICodeBuilder): void;
  testCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  registerCodeTest(builder: ICodeBuilder): void;
  addLanguageChoice(language: string): void;
}

export interface IPreferencesAPI {
  onDidPreferencesFolderChanged: vscode.Event<IPreferencesChangedPair[]>;
  getPreferences(workspace: vscode.WorkspaceFolder): IPreferences;
  getFirstOrSelectedWorkspace(): Promise<vscode.WorkspaceFolder | undefined>;
}

export interface IExternalAPI {
  getToolAPI(): IToolAPI;
  getExampleTemplateAPI(): IExampleTemplateAPI;
  getDeployDebugAPI(): IDeployDebugAPI;
  getBuildTestAPI(): IBuildTestAPI;
  getPreferencesAPI(): IPreferencesAPI;
  getCommandAPI(): ICommandAPI;
  getExecuteAPI(): IExecuteAPI;
}

export interface IPreferences {
  getTeamNumber(): Promise<number>;
  setTeamNumber(teamNumber: number): Promise<void>;
  getCurrentLanguage(): string;
  setCurrentLanguage(language: string): Promise<void>;
  getAutoStartRioLog(): boolean;
  setAutoStartRioLog(autoStart: boolean, global: boolean): Promise<void>;
  getAutoSaveOnDeploy(): boolean;
  setAutoSaveOnDeploy(autoSave: boolean, global: boolean): Promise<void>;
  getIsWPILibProject(): boolean;
  getOnline(): boolean;
  getSkipTests(): boolean;
  getStopSimulationOnEntry(): boolean;
  getAdditionalGradleArguments(): string;
  setOnline(value: boolean, global: boolean): Promise<void>;
  setSkipTests(value: boolean, global: boolean): Promise<void>;
  setStopSimulationOnEntry(value: boolean, global: boolean): Promise<void>;
}

export interface IExampleTemplateCreator {
  getLanguage(): string;
  getDisplayName(): string;
  getDescription(): string;
  generate(folderInto: vscode.Uri): Promise<boolean>;
}

export interface ICommandCreator {
  getLanguage(): string;
  getDisplayName(): string;
  getDescription(): string;
  getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean>;
  generate(folder: vscode.Uri, workspace: vscode.WorkspaceFolder): Promise<boolean>;
}

export interface IToolRunner {
  runTool(): Promise<boolean>;
  getDisplayName(): string;
  getDescription(): string;
}

/**
 * Interface to providing a code deployer or debugger
 * to the core plugin.
 */
export interface ICodeDeployer {
  /**
   * Returns if this deployer is currently valid to be used
   * in the current workspace
   */
  getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean>;
  /**
   * Run the command with the specified team number
   *
   * @param teamNumber The team number to deploy to
   */
  runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;

  /**
   * Get the display name to be used for selection
   */
  getDisplayName(): string;
  getDescription(): string;
}

/**
 * Interface to providing a code deployer or debugger
 * to the core plugin.
 */
export interface ICodeBuilder {
  /**
   * Returns if this deployer is currently valid to be used
   * in the current workspace
   */
  getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): Promise<boolean>;
  /**
   * Run the command with the specified team number
   */
  runBuilder(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;

  /**
   * Get the display name to be used for selection
   */
  getDisplayName(): string;
  getDescription(): string;
}

export async function getWPILibApi(): Promise<IExternalAPI | undefined> {
  const wpilib: vscode.Extension<IExternalAPI> | undefined = vscode.extensions.getExtension('wpilibsuite.vscode-wpilib');
  let extension: IExternalAPI | undefined;

  if (wpilib) {
    extension = wpilib.isActive ? wpilib.exports : await wpilib.activate();
  }
  return extension;
}
