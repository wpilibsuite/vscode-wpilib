'use strict';
import * as vscode from 'vscode';

export interface IPreferencesChangedPair {
  workspace: vscode.WorkspaceFolder;
  preference: IPreferences;
}

export interface ICreatorQuickPick extends vscode.QuickPickItem {
  creator: IExampleTemplateCreator;
}

export abstract class IToolAPI {
  public abstract startTool(): Promise<boolean>;
  public abstract addTool(tool: IToolRunner): void;
}

export abstract class IExecuteAPI {
  public abstract executeCommand(command: string, name: string, rootDir: string, workspace: vscode.WorkspaceFolder): Promise<number>;
  public abstract cancelCommands(): Promise<number>;
}

export abstract class IExampleTemplateAPI {
  public abstract addTemplateProvider(provider: IExampleTemplateCreator): void;
  public abstract addExampleProvider(provider: IExampleTemplateCreator): void;
  public abstract getLanguages(template: boolean): string[];
  public abstract getBases(template: boolean, language: string): ICreatorQuickPick[];
  public abstract createProject(template: boolean, language: string, base: string, toFolder: string,
                                newFolder: boolean, projectName: string, teamNumber: number): Promise<boolean>;
}

export abstract class ICommandAPI {
  public abstract addCommandProvider(provider: ICommandCreator): void;
  public abstract createCommand(workspace: vscode.WorkspaceFolder, folder: vscode.Uri): Promise<boolean>;
}

export abstract class IDeployDebugAPI {
  public abstract startRioLog(teamNumber: number, show: boolean): Promise<boolean>;
  public abstract deployCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  public abstract registerCodeDeploy(deployer: ICodeDeployer): void;
  public abstract debugCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  public abstract registerCodeDebug(deployer: ICodeDeployer): void;
  public abstract simulateCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  public abstract registerCodeSimulate(deployer: ICodeDeployer): void;
  public abstract addLanguageChoice(language: string): void;
  public abstract getLanguageChoices(): string[];
}

export abstract class IBuildTestAPI {
  public abstract buildCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  public abstract registerCodeBuild(builder: ICodeBuilder): void;
  public abstract testCode(workspace: vscode.WorkspaceFolder, source: vscode.Uri | undefined): Promise<boolean>;
  public abstract registerCodeTest(builder: ICodeBuilder): void;
  public abstract addLanguageChoice(language: string): void;
}

export abstract class IPreferencesAPI {
  public abstract onDidPreferencesFolderChanged: vscode.Event<IPreferencesChangedPair[]>;
  public abstract getPreferences(workspace: vscode.WorkspaceFolder): IPreferences;
  public abstract getFirstOrSelectedWorkspace(): Promise<vscode.WorkspaceFolder | undefined>;
}

export abstract class IExternalAPI {
  public abstract getToolAPI(): IToolAPI;
  public abstract getExampleTemplateAPI(): IExampleTemplateAPI;
  public abstract getDeployDebugAPI(): IDeployDebugAPI;
  public abstract getBuildTestAPI(): IBuildTestAPI;
  public abstract getPreferencesAPI(): IPreferencesAPI;
  public abstract getCommandAPI(): ICommandAPI;
  public abstract getExecuteAPI(): IExecuteAPI;
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
  const wpilib: vscode.Extension<IExternalAPI> | undefined = vscode.extensions.getExtension('wpifirst.vscode-wpilib');
  let extension: IExternalAPI | undefined;

  if (wpilib) {
    if (!wpilib.isActive) {
      extension = await wpilib.activate();
    } else {
      extension = wpilib.exports;
    }
  }
  return extension;
}
