'use strict';

import * as vscode from 'vscode';

export interface IInstalledDep {
  key: string;
  name: string;
  version: string;
  availableVersions: string[];
}

export interface IAvailableDep {
  key: string;
  name: string;
  version: string;
  description: string;
  website: string;
  instructions?: string;
}

export interface IDepUpdate {
  key: string;
  name: string;
  oldVersion: string;
  newVersion: string;
}

export interface IVendorDepSnapshot {
  installed: IInstalledDep[];
  available: IAvailableDep[];
}

export interface IDepInputLabels {
  /** Placeholder for the manual install input, e.g. 'Vendordep JSON URL'. */
  inputName: string;
  /** Used mid-sentence in the quick pick prompt, e.g. 'Enter a vendor dependency JSON URL'. */
  sourceName: string;
  /** Heading of the manual install section, e.g. 'Install from URL'. */
  sectionTitle: string;
  /** One line under the manual install input saying when to use it. */
  helpText: string;
}

export interface IVendorDepProvider {
  getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): boolean;

  getPostChangeActionName(): string;

  isNewerVersion(version1: string, version2: string): boolean;

  getInputLabels(): IDepInputLabels;

  getSnapshot(workspace: vscode.WorkspaceFolder): Promise<IVendorDepSnapshot>;

  getOfflineUpdates(workspace: vscode.WorkspaceFolder): Promise<IDepUpdate[]>;

  getOnlineUpdates(workspace: vscode.WorkspaceFolder): Promise<IDepUpdate[]>;

  install(workspace: vscode.WorkspaceFolder, dep: IAvailableDep): Promise<boolean>;

  installFromInput(workspace: vscode.WorkspaceFolder, input: string): Promise<boolean>;

  installNewOffline(workspace: vscode.WorkspaceFolder): Promise<boolean>;

  uninstall(workspace: vscode.WorkspaceFolder, keys: string[]): Promise<boolean>;

  updateTo(workspace: vscode.WorkspaceFolder, key: string, version: string): Promise<boolean>;
}
