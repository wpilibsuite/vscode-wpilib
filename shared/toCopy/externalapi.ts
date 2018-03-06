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
  abstract startTool(): Promise<boolean>;
  abstract addTool(tool: IToolRunner): void;
  getVersion(): number {
    return toolAPIExpectedVersion;
  }
}

const exampleTemplateAPIExpectedVersion = 1;
export function getExampleTemplateAPIExpectedVersion(): number {
  return exampleTemplateAPIExpectedVersion;
}
export abstract class IExampleTemplateAPI implements IVersionable {
  abstract addTemplateProvider(provider: ITemplateExampleCreator): void;
  abstract addExampleProvider(provider: ITemplateExampleCreator): void;
  abstract createExample(): Promise<boolean>;
  abstract createTemplate(): Promise<boolean>;
  getVersion(): number {
    return exampleTemplateAPIExpectedVersion;
  }
}

const deployDebugAPIExpectedVersion = 1;
export function getDeployDebugAPIExpectedVersion(): number {
  return deployDebugAPIExpectedVersion;
}
export abstract class IDeployDebugAPI implements IVersionable {
  abstract startRioLog(teamNumber: number, show: boolean): Promise<boolean>;
  abstract deployCode(workspace: vscode.WorkspaceFolder): Promise<boolean>;
  abstract registerCodeDeploy(deployer: ICodeDeployer): void;
  abstract debugCode(workspace: vscode.WorkspaceFolder): Promise<boolean>;
  abstract registerCodeDebug(deployer: ICodeDeployer): void;
  abstract addLanguageChoice(language: string): void;
  getVersion(): number {
    return deployDebugAPIExpectedVersion;
  }
}

const preferencesAPIExpectedVersion = 1;
export function getPreferencesAPIExpectedVersion(): number {
  return preferencesAPIExpectedVersion;
}
export abstract class IPreferencesAPI implements IVersionable {
  abstract getPreferences(workspace: vscode.WorkspaceFolder): IPreferences | undefined;
  abstract onDidPreferencesFolderChanged: vscode.Event<IPreferencesChangedPair[]>;
  abstract getFirstOrSelectedWorkspace(): Promise<vscode.WorkspaceFolder | undefined>;
  getVersion(): number {
    return preferencesAPIExpectedVersion;
  }
}

const externalAPIExpectedVersion = 1;
export function getExternalAPIExpectedVersion(): number {
  return externalAPIExpectedVersion;
}
export abstract class IExternalAPI implements IVersionable {
  abstract getToolAPI(): IToolAPI | undefined;
  abstract getExampleTemplateAPI(): IExampleTemplateAPI | undefined;
  abstract getDeployDebugAPI(): IDeployDebugAPI | undefined;
  abstract getPreferencesAPI(): IPreferencesAPI | undefined;
  getVersion(): number {
    return externalAPIExpectedVersion;
  }
}

export interface ILanguageSpecific {
  languageName: string;
  languageData: any;
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
  getLanguageSpecific(language: string): ILanguageSpecific | undefined;
  setLanguageSpecific(data: ILanguageSpecific): void;
}

export interface ITemplateExampleCreator {
  getLanguage(): string;
  getDisplayName(): string;
  getDescription(): string;
  generate(): Promise<boolean>;
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
