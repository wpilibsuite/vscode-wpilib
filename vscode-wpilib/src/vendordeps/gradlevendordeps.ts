'use strict';

import * as path from 'path';
import { readdir, unlink } from 'fs/promises';
import * as vscode from 'vscode';
import { IExternalAPI } from '../api';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import {
  getDependencies,
  getHomeDirDeps,
  IJsonDependency,
  installDependency,
  loadFileFromUrl,
  parseVendordepJson,
} from '../shared/vendorlibrariesbase';
import { isNewerVersion } from '../versions';
import { IJsonList, loadManifest, vendordepMarketplaceURL } from './marketplace';
import {
  IAvailableDep,
  IDepInputLabels,
  IDepUpdate,
  IInstalledDep,
  IVendorDepProvider,
  IVendorDepSnapshot,
} from './vendordepprovider';

export function getWpVendorFolder(workspace: vscode.WorkspaceFolder): string {
  return path.join(workspace.uri.fsPath, 'vendordeps');
}

export class GradleVendorDepProvider implements IVendorDepProvider {
  private externalApi: IExternalAPI;
  private listed: IJsonList[] = [];
  private homeDeps: IJsonDependency[] = [];

  constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;
  }

  public getIsCurrentlyValid(_workspace: vscode.WorkspaceFolder): boolean {
    return true;
  }

  public getPostChangeActionName(): string {
    return i18n('ui', 'Build');
  }

  public isNewerVersion(version1: string, version2: string): boolean {
    return isNewerVersion(version1, version2);
  }

  public getInputLabels(): IDepInputLabels {
    return {
      inputName: i18n('ui', 'URL'),
      sourceName: i18n('ui', 'JSON URL'),
    };
  }

  public async getSnapshot(workspace: vscode.WorkspaceFolder): Promise<IVendorDepSnapshot> {
    const listed = await this.getListedDeps(workspace);
    const installedDeps = await this.getInstalledDependencies(workspace);

    const installed: IInstalledDep[] = installedDeps.map((dep) => ({
      key: dep.uuid,
      name: dep.name,
      version: dep.version,
      availableVersions: listed
        .filter((entry) => entry.uuid === dep.uuid)
        .map((entry) => entry.version),
    }));

    const installedUuids = new Set(installedDeps.map((dep) => dep.uuid));
    const available: IAvailableDep[] = listed
      .filter((entry) => !installedUuids.has(entry.uuid))
      .map((entry) => ({
        key: entry.uuid,
        name: entry.name,
        version: entry.version,
        description: entry.description,
        website: entry.website,
        instructions: entry.instructions,
      }));

    return { installed, available };
  }

  public async getOfflineUpdates(workspace: vscode.WorkspaceFolder): Promise<IDepUpdate[]> {
    const installedDeps = await this.getInstalledDependencies(workspace);
    const availableDeps = await getHomeDirDeps();
    this.homeDeps = availableDeps;
    const updates: IDepUpdate[] = [];
    for (const available of availableDeps) {
      for (const installed of installedDeps) {
        if (
          installed.uuid === available.uuid &&
          isNewerVersion(available.version, installed.version)
        ) {
          updates.push({
            key: available.uuid,
            name: available.name,
            oldVersion: installed.version,
            newVersion: available.version,
          });
        }
      }
    }
    return updates;
  }

  public async getOnlineUpdates(workspace: vscode.WorkspaceFolder): Promise<IDepUpdate[]> {
    const installedDeps = await this.getInstalledDependencies(workspace);
    const promises = installedDeps.map(async (dep) => {
      if (!dep.jsonUrl) {
        return undefined;
      }
      try {
        return await loadFileFromUrl(dep.jsonUrl);
      } catch (err) {
        logger.log('Error fetching file', err);
        return undefined;
      }
    });
    const results = (await Promise.all(promises)).filter((x) => x !== undefined);
    const updates: IDepUpdate[] = [];
    for (const newDep of results) {
      for (const oldDep of installedDeps) {
        if (newDep.uuid === oldDep.uuid) {
          if (isNewerVersion(newDep.version, oldDep.version)) {
            updates.push({
              key: newDep.uuid,
              name: newDep.name,
              oldVersion: oldDep.version,
              newVersion: newDep.version,
            });
          }
          break;
        }
      }
    }
    return updates;
  }

  public async install(workspace: vscode.WorkspaceFolder, dep: IAvailableDep): Promise<boolean> {
    const jsonDep = await this.resolveDependency(dep);
    if (!jsonDep) {
      vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', dep.name));
      return false;
    }
    const installed = await this.installWithConflictsAndRequires(workspace, jsonDep);
    if (installed && dep.instructions) {
      await this.showInstructions(dep.instructions);
    }
    return installed;
  }

  public async installFromInput(
    workspace: vscode.WorkspaceFolder,
    input: string
  ): Promise<boolean> {
    const url = input.trim();
    if (!url) {
      vscode.window.showErrorMessage(i18n('message', 'Please enter a valid URL'));
      return false;
    }

    let file: IJsonDependency;
    try {
      file = await loadFileFromUrl(url);
    } catch {
      vscode.window.showErrorMessage(i18n('message', 'Failed to load vendor file from URL.'));
      return false;
    }

    const existing = await this.getInstalledDependencies(workspace);
    for (const dep of existing) {
      if (dep.uuid === file.uuid) {
        if (dep.version === file.version) {
          vscode.window.showInformationMessage(
            i18n('message', '{0} version {1} is already installed.', file.name, file.version)
          );
          return false;
        }
        const res = await vscode.window.showWarningMessage(
          i18n(
            'message',
            '{0} version {1} is already installed. Would you like to update to {2}?',
            file.name,
            dep.version,
            file.version
          ),
          { modal: true },
          i18n('ui', 'Yes'),
          i18n('ui', 'No')
        );
        if (res !== i18n('ui', 'Yes')) {
          return false;
        }
      }
    }

    return this.installWithConflictsAndRequires(workspace, file);
  }

  public async installNewOffline(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const installedDeps = await this.getInstalledDependencies(workspace);
    const availableDeps = await getHomeDirDeps();
    const installedUuids = new Set(installedDeps.map((dep) => dep.uuid));
    const notInstalled = availableDeps.filter((dep) => !installedUuids.has(dep.uuid));

    if (notInstalled.length === 0) {
      vscode.window.showInformationMessage(i18n('message', 'No new dependencies available'));
      return false;
    }

    const toInstall = await vscode.window.showQuickPick(
      notInstalled.map((dep) => ({ label: dep.name, description: dep.version, dep })),
      {
        canPickMany: true,
        placeHolder: i18n('message', 'Check to install libraries'),
      }
    );
    if (!toInstall) {
      return false;
    }

    let anySucceeded = false;
    for (const ti of toInstall) {
      const success = await installDependency(ti.dep, getWpVendorFolder(workspace), true);
      if (!success) {
        vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', ti.dep.name));
      } else {
        anySucceeded = true;
      }
    }
    return anySucceeded;
  }

  public async uninstall(workspace: vscode.WorkspaceFolder, keys: string[]): Promise<boolean> {
    let anySucceeded = false;
    if (keys.length === 0) {
      return false;
    }
    const url = getWpVendorFolder(workspace);
    const files = await readdir(url);
    for (const file of files) {
      const fullPath = path.join(url, file);
      const result = await parseVendordepJson(fullPath);
      if (result && keys.includes(result.uuid)) {
        try {
          await unlink(fullPath);
          anySucceeded = true;
        } catch (err) {
          logger.error('Failed to delete vendor dependency file', {
            file: fullPath,
            error: err,
          });
        }
      }
    }
    return anySucceeded;
  }

  public async updateTo(
    workspace: vscode.WorkspaceFolder,
    key: string,
    version: string
  ): Promise<boolean> {
    const listed = await this.getListedDeps(workspace);
    const entry = listed.find((dep) => dep.uuid === key && dep.version === version);
    if (!entry) {
      logger.log(`No vendordep listed for ${key} version ${version}`);
      return false;
    }
    return this.install(workspace, {
      key: entry.uuid,
      name: entry.name,
      version: entry.version,
      description: entry.description,
      website: entry.website,
      instructions: entry.instructions,
    });
  }

  public async getInstalledDependencies(
    workspace: vscode.WorkspaceFolder
  ): Promise<IJsonDependency[]> {
    return getDependencies(getWpVendorFolder(workspace));
  }

  private async getListedDeps(workspace: vscode.WorkspaceFolder): Promise<IJsonList[]> {
    const projectYear = this.externalApi
      .getPreferencesAPI()
      .getPreferences(workspace)
      .getProjectYear();
    let listed: IJsonList[] = [];
    try {
      listed = await loadManifest(projectYear);
    } catch (err) {
      logger.log('Error fetching vendordep marketplace manifest for', projectYear, err);
    }

    this.homeDeps = await getHomeDirDeps();
    for (const homedep of this.homeDeps) {
      const found = listed.find(
        (onlinedep) => onlinedep.uuid === homedep.uuid && onlinedep.version === homedep.version
      );
      if (!found) {
        listed.push({
          path: homedep.jsonUrl,
          name: homedep.name,
          version: homedep.version,
          uuid: homedep.uuid,
          description: i18n('ui', 'Loaded from Local Copy'),
          website: i18n('ui', 'Loaded from Local Copy'),
        });
      }
    }

    this.listed = listed;
    return listed;
  }

  private async resolveDependency(dep: IAvailableDep): Promise<IJsonDependency | undefined> {
    const entry = this.listed.find(
      (listed) => listed.uuid === dep.key && listed.version === dep.version
    );
    if (entry) {
      let url = entry.path;
      if (url.substring(0, 4) !== 'http') {
        url = vendordepMarketplaceURL + url;
      }
      try {
        return await loadFileFromUrl(url);
      } catch {
        logger.log(`Failed to load vendordep from ${url}, falling back to home directory copy`);
      }
    }
    return this.homeDeps.find(
      (homedep) => homedep.uuid === dep.key && homedep.version === dep.version
    );
  }

  private async installWithConflictsAndRequires(
    workspace: vscode.WorkspaceFolder,
    dep: IJsonDependency
  ): Promise<boolean> {
    const existing = await this.getInstalledDependencies(workspace);
    if (dep.conflictsWith) {
      for (const conflict of dep.conflictsWith) {
        if (existing.find((installedDep) => installedDep.uuid === conflict.uuid)) {
          vscode.window.showErrorMessage(i18n('message', '{0}', conflict.errorMessage), {
            modal: true,
          });
          return false;
        }
      }
    }

    const success = await installDependency(dep, getWpVendorFolder(workspace), true);
    if (!success) {
      vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', dep.name));
      return false;
    }

    for (const required of dep.requires ?? []) {
      try {
        const requiredDep = await loadFileFromUrl(required.onlineUrl);
        await installDependency(requiredDep, getWpVendorFolder(workspace), true);
      } catch {
        vscode.window.showWarningMessage(
          i18n('message', 'Failed to install required dependency: {0}', required.errorMessage)
        );
      }
    }
    return true;
  }

  private async showInstructions(instructions: string): Promise<void> {
    try {
      new URL(instructions);
      await vscode.commands.executeCommand('simpleBrowser.show', instructions);
    } catch {
      vscode.window.showErrorMessage(
        i18n('message', 'Could not display website! Invalid URL: "{0}"', instructions)
      );
    }
  }
}
