'use strict';

import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExecuteAPI, IExternalAPI } from '../api';
import { localize as i18n } from '../locale';
import { logger } from '../logger';
import {
  getAvailableVersions,
  getInstalledVersion,
  installPackage,
  installWheel,
  parseWheelName,
} from '../python/packages';
import { getRobotPyVersion } from '../pythondetector';
import { allComponents, isComponent } from '../shared/components';
import {
  addRequirements,
  disableComponents,
  enableComponents,
  getComponents,
  getRequirements,
  IRequires,
  parseRequirement,
  removeRequirements,
  setRequirementVersion,
  stripPrerelease,
} from '../shared/pyproject';
import { getWPILibYear } from '../shared/utilitiesapi';
import { isNewerPythonVersion } from '../versions';
import { loadManifest } from './marketplace';
import {
  IAvailableDep,
  IDepInputLabels,
  IDepUpdate,
  IInstalledDep,
  IVendorDepProvider,
  IVendorDepSnapshot,
} from './vendordepprovider';

export class RobotPyVendorDepProvider implements IVendorDepProvider {
  private externalApi: IExternalAPI;
  private executeApi: IExecuteAPI;

  constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;
    this.executeApi = externalApi.getExecuteAPI();
  }

  public getIsCurrentlyValid(workspace: vscode.WorkspaceFolder): boolean {
    return this.externalApi.getPreferencesAPI().getPreferences(workspace).getIsRobotPyProject();
  }

  public getPostChangeActionName(): string {
    return i18n('ui', 'Sync');
  }

  public isNewerVersion(version1: string, version2: string): boolean {
    return isNewerPythonVersion(version1, version2);
  }

  public getInputLabels(): IDepInputLabels {
    return {
      inputName: i18n('ui', 'Package name'),
      sourceName: i18n('ui', 'package name'),
      sectionTitle: i18n('ui', 'Install by name'),
      helpText: i18n('ui', 'For packages that are not listed below.'),
    };
  }

  public async getSnapshot(workspace: vscode.WorkspaceFolder): Promise<IVendorDepSnapshot> {
    const root = workspace.uri.fsPath;
    const components = await getComponents(root);
    const requirements = await getRequirements(root);

    const robotpyVersion = (await getRobotPyVersion(root)) ?? '';
    const installed: IInstalledDep[] = components.map((component) => ({
      key: component,
      name: component,
      version: robotpyVersion,
      availableVersions: [],
    }));

    for (const req of requirements) {
      const availableVersions = await getAvailableVersions(req.name, root);
      installed.push({
        key: req.name,
        name: req.name,
        version: await this.getDisplayVersion(req, availableVersions, root),
        availableVersions,
      });
    }

    const declared = new Set(installed.map((dep) => dep.key));
    const available: IAvailableDep[] = [];
    for (const component of allComponents) {
      if (component !== 'all' && !declared.has(component)) {
        available.push({
          key: component,
          name: component,
          version: '',
          description: i18n('ui', 'WPILib Component'),
          website: i18n('ui', 'WPILib Component'),
        });
      }
    }
    for (const entry of await this.getListedPythonDeps(workspace)) {
      if (
        entry.python &&
        !declared.has(entry.python) &&
        !available.find((a) => a.key === entry.python)
      ) {
        available.push({
          key: entry.python,
          name: entry.python,
          version: '',
          description: entry.description,
          website: entry.website,
          instructions: entry.instructions,
        });
      }
    }

    return { installed, available };
  }

  public async getOfflineUpdates(workspace: vscode.WorkspaceFolder): Promise<IDepUpdate[]> {
    return this.getUpdates(workspace, true);
  }

  public async getOnlineUpdates(workspace: vscode.WorkspaceFolder): Promise<IDepUpdate[]> {
    return this.getUpdates(workspace, false);
  }

  public async install(workspace: vscode.WorkspaceFolder, dep: IAvailableDep): Promise<boolean> {
    return this.installPackageOrComponent(workspace, dep.key, dep.version || undefined);
  }

  public async installFromInput(
    workspace: vscode.WorkspaceFolder,
    input: string
  ): Promise<boolean> {
    const req = parseRequirement(input.trim());
    if (!req.name) {
      vscode.window.showErrorMessage(i18n('message', 'Please enter a valid package name'));
      return false;
    }
    const pinned = req.specifier === '==' || req.specifier === '===';
    return this.installPackageOrComponent(workspace, req.name, pinned ? req.version : undefined);
  }

  public async installNewOffline(workspace: vscode.WorkspaceFolder): Promise<boolean> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Downloads')),
      filters: {
        'Wheel File': ['whl'],
      },
      openLabel: i18n('ui', 'Select a Package'),
    });
    if (!picked || picked.length !== 1) {
      return false;
    }
    const wheelPath = picked[0].fsPath;
    const wheel = parseWheelName(wheelPath);
    if (!wheel) {
      vscode.window.showErrorMessage(
        i18n(
          'message',
          'Could not read a package name and version from {0}',
          path.basename(wheelPath)
        )
      );
      return false;
    }
    if (!(await this.confirmYearCompatibility(wheel.version, false))) {
      return false;
    }
    if (!(await installWheel(wheelPath, workspace, this.executeApi))) {
      return false;
    }
    return addRequirements(workspace.uri.fsPath, [
      { name: wheel.name, specifier: '~=', version: wheel.version, availableVersions: [] },
    ]);
  }

  public async uninstall(workspace: vscode.WorkspaceFolder, keys: string[]): Promise<boolean> {
    if (keys.length === 0) {
      return false;
    }
    const root = workspace.uri.fsPath;
    const components = keys.filter((key) => isComponent(key));
    const packages = keys.filter((key) => !isComponent(key));
    let succeeded = true;
    if (components.length > 0) {
      succeeded = (await disableComponents(root, components)) && succeeded;
    }
    if (packages.length > 0) {
      succeeded = (await removeRequirements(root, packages)) && succeeded;
    }
    return succeeded;
  }

  public async updateTo(
    workspace: vscode.WorkspaceFolder,
    key: string,
    version: string
  ): Promise<boolean> {
    if (isComponent(key)) {
      return false;
    }
    const root = workspace.uri.fsPath;
    const exact = stripPrerelease(version);
    const declared = (await getRequirements(root)).find((req) => req.name === key);
    const updated = await setRequirementVersion(root, {
      name: key,
      specifier: declared?.specifier,
      version: exact,
      availableVersions: [],
    });
    if (!updated) {
      return false;
    }
    return installPackage(key, workspace, this.executeApi, exact);
  }

  private async getDisplayVersion(
    req: IRequires,
    availableVersions: string[],
    root: string
  ): Promise<string> {
    const version = req.version ?? (await getInstalledVersion(req.name, root));
    if (!version) {
      return '';
    }
    const prerelease = `${version} (prerelease)`;
    return availableVersions.includes(prerelease) ? prerelease : version;
  }

  private async getUpdates(
    workspace: vscode.WorkspaceFolder,
    offlineOnly: boolean
  ): Promise<IDepUpdate[]> {
    const root = workspace.uri.fsPath;
    const updates: IDepUpdate[] = [];
    for (const req of await getRequirements(root)) {
      const availableVersions = offlineOnly
        ? await getAvailableVersions(req.name, root, true)
        : await getAvailableVersions(req.name, root);
      const current = await this.getDisplayVersion(req, availableVersions, root);
      if (!current) {
        continue;
      }
      const newest = availableVersions.find((v) => this.isNewerVersion(v, current));
      if (newest) {
        updates.push({
          key: req.name,
          name: req.name,
          oldVersion: current,
          newVersion: newest,
        });
      }
    }
    return updates;
  }

  private async installPackageOrComponent(
    workspace: vscode.WorkspaceFolder,
    name: string,
    version?: string
  ): Promise<boolean> {
    const root = workspace.uri.fsPath;
    if (isComponent(name)) {
      return enableComponents(root, [name]);
    }

    const exact = version ? stripPrerelease(version) : undefined;
    if (exact && !(await this.confirmYearCompatibility(exact, true))) {
      return false;
    }

    vscode.window.showInformationMessage(
      i18n('message', 'Installing {0}, this can take a few minutes', name)
    );
    if (!(await installPackage(name, workspace, this.executeApi, exact))) {
      vscode.window.showErrorMessage(
        i18n('message', 'Failed to install {0}. Is the package name correct?', name)
      );
      return false;
    }

    const installedVersion = exact ?? (await getInstalledVersion(name, root));
    return addRequirements(root, [
      { name, specifier: '~=', version: installedVersion, availableVersions: [] },
    ]);
  }

  private async confirmYearCompatibility(version: string, maybe: boolean): Promise<boolean> {
    if (getWPILibYear().indexOf(version.substring(0, 4)) !== -1) {
      return true;
    }
    const message = maybe
      ? i18n(
          'message',
          'This package may not be compatible with the current WPILib Version, would you still like to install?'
        )
      : i18n(
          'message',
          'This package is not compatible with the current WPILib Version, would you still like to install?'
        );
    const res = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      i18n('ui', 'Yes'),
      i18n('ui', 'No')
    );
    return res === i18n('ui', 'Yes');
  }

  private async getListedPythonDeps(workspace: vscode.WorkspaceFolder) {
    const projectYear = this.externalApi
      .getPreferencesAPI()
      .getPreferences(workspace)
      .getProjectYear();
    try {
      return (await loadManifest(projectYear)).filter((entry) => entry.python);
    } catch (err) {
      logger.log('Error fetching vendordep marketplace manifest for', projectYear, err);
      return [];
    }
  }
}
