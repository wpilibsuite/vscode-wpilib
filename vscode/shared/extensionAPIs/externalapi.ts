'use strict';
import * as vscode from 'vscode';

// This file is designed to be copied into an
// external project to support the extension API

export interface IPreferencesChangedPair {
  workspace: vscode.WorkspaceFolder;
  preference: IPreferences;
}

export interface IVersionable {
  getVersion(): number;
}

const toolAPIExpectedVersion = 1;
export function getToolAPIExpectedVersion(): number {
  return toolAPIExpectedVersion;
}
export abstract class IToolAPI implements IVersionable {
  public abstract startTool(): Promise<boolean>;
  public abstract addTool(tool: IToolRunner): void;
  public getVersion(): number {
    return toolAPIExpectedVersion;
  }
}

const exampleTemplateAPIExpectedVersion = 1;
export function getExampleTemplateAPIExpectedVersion(): number {
  return exampleTemplateAPIExpectedVersion;
}
export abstract class IExampleTemplateAPI implements IVersionable {
  public abstract addTemplateProvider(provider: IExampleTemplateCreator): void;
  public abstract addExampleProvider(provider: IExampleTemplateCreator): void;
  public abstract createExample(): Promise<boolean>;
  public abstract createTemplate(): Promise<boolean>;
  public getVersion(): number {
    return exampleTemplateAPIExpectedVersion;
  }
}

const commandAPIExpectedVersion = 1;
export function getCommandAPIExpectedVersion(): number {
  return exampleTemplateAPIExpectedVersion;
}
export abstract class ICommandAPI implements IVersionable {
  public abstract addCommandProvider(provider: ICommandCreator): void;
  public abstract createCommand(workspace: vscode.WorkspaceFolder, folder: vscode.Uri): Promise<boolean>;
  public getVersion(): number {
    return commandAPIExpectedVersion;
  }
}

const deployDebugAPIExpectedVersion = 1;
export function getDeployDebugAPIExpectedVersion(): number {
  return deployDebugAPIExpectedVersion;
}
export abstract class IDeployDebugAPI implements IVersionable {
  public abstract startRioLog(teamNumber: number, show: boolean): Promise<boolean>;
  public abstract deployCode(workspace: vscode.WorkspaceFolder): Promise<boolean>;
  public abstract registerCodeDeploy(deployer: ICodeDeployer): void;
  public abstract debugCode(workspace: vscode.WorkspaceFolder): Promise<boolean>;
  public abstract registerCodeDebug(deployer: ICodeDeployer): void;
  public abstract addLanguageChoice(language: string): void;
  public getVersion(): number {
    return deployDebugAPIExpectedVersion;
  }
}

const preferencesAPIExpectedVersion = 1;
export function getPreferencesAPIExpectedVersion(): number {
  return preferencesAPIExpectedVersion;
}
export abstract class IPreferencesAPI implements IVersionable {
  public abstract getPreferences(workspace: vscode.WorkspaceFolder): IPreferences | undefined;
  public abstract onDidPreferencesFolderChanged: vscode.Event<IPreferencesChangedPair[]>;
  public abstract getFirstOrSelectedWorkspace(): Promise<vscode.WorkspaceFolder | undefined>;
  public getVersion(): number {
    return preferencesAPIExpectedVersion;
  }
}

const externalAPIExpectedVersion = 1;
export function getExternalAPIExpectedVersion(): number {
  return externalAPIExpectedVersion;
}
export abstract class IExternalAPI implements IVersionable {
  public abstract getToolAPI(): IToolAPI | undefined;
  public abstract getExampleTemplateAPI(): IExampleTemplateAPI | undefined;
  public abstract getDeployDebugAPI(): IDeployDebugAPI | undefined;
  public abstract getPreferencesAPI(): IPreferencesAPI | undefined;
  public abstract getCommandAPI(): ICommandAPI | undefined;
  public getVersion(): number {
    return externalAPIExpectedVersion;
  }
}

export interface IPreferences {
  getTeamNumber(): Promise<number>;
  setTeamNumber(teamNumber: number, global: boolean): void;
  getCurrentLanguage(): string;
  setCurrentLanguage(language: string): void;
  getAutoStartRioLog(): boolean;
  setAutoStartRioLog(autoStart: boolean, global: boolean): void;
  getAutoSaveOnDeploy(): boolean;
  setAutoSaveOnDeploy(autoSave: boolean, global: boolean): void;
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
  runDeployer(teamNumber: number, workspace: vscode.WorkspaceFolder): Promise<boolean>;

  /**
   * Get the display name to be used for selection
   */
  getDisplayName(): string;
  getDescription(): string;
}
