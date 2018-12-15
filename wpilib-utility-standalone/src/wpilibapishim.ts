'use strict';

import * as vscode from './vscodeshim';

export interface ICreatorQuickPick extends vscode.QuickPickItem {
  creator: IExampleTemplateCreator;
}

export interface IExampleTemplateCreator {
  getLanguage(): string;
  getDisplayName(): string;
  getDescription(): string;
  generate(folderInto: vscode.Uri): Promise<boolean>;
}

export interface IExampleTemplateAPI {
  addTemplateProvider(provider: IExampleTemplateCreator): void;
  addExampleProvider(provider: IExampleTemplateCreator): void;
  getLanguages(template: boolean): string[];
  getBases(template: boolean, language: string): ICreatorQuickPick[];
  createProject(template: boolean, language: string, base: string, toFolder: string,
                newFolder: boolean, projectName: string, teamNumber: number): Promise<boolean>;
}

export interface IUtilitiesAPI {
  getWPILibHomeDir(): string;
}
