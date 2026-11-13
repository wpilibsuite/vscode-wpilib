'use strict';

import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { localize as i18n } from './locale';
import { IJsonDependency } from './shared/vendorlibrariesbase';
import { GradleVendorDepProvider } from './vendordeps/gradlevendordeps';
import { RobotPyVendorDepProvider } from './vendordeps/robotpyvendordeps';
import { IDepUpdate, IInstalledDep, IVendorDepProvider } from './vendordeps/vendordepprovider';

class OptionQuickPick implements vscode.QuickPickItem {
  public label: string;
  public func: (workspace: vscode.WorkspaceFolder) => Promise<void>;

  constructor(name: string, func: (workspace: vscode.WorkspaceFolder) => Promise<void>) {
    this.label = name;
    this.func = func;
  }
}

class DepQuickPick implements vscode.QuickPickItem {
  public label: string;
  public description: string;
  public key: string;
  public version: string;

  constructor(name: string, key: string, version: string, oldVersion?: string) {
    this.label = name;
    this.description = version;
    if (oldVersion) {
      this.description += ` (${i18n('ui', 'Old Version: {0}', oldVersion)})`;
    }
    this.key = key;
    this.version = version;
  }
}

export class VendorLibraries {
  private disposables: vscode.Disposable[] = [];
  private externalApi: IExternalAPI;
  private lastBuildTime = 1;
  private gradleProvider: GradleVendorDepProvider;
  private providers: IVendorDepProvider[];

  constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;
    this.gradleProvider = new GradleVendorDepProvider(externalApi);
    this.providers = [new RobotPyVendorDepProvider(externalApi), this.gradleProvider];

    this.disposables.push(
      vscode.commands.registerCommand(
        'wpilibcore.manageVendorLibs',
        (uri: vscode.Uri | undefined) => {
          return this.manageVendorLibraries(uri);
        },
        this
      )
    );
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public getProvider(workspace: vscode.WorkspaceFolder): IVendorDepProvider {
    return (
      this.providers.find((provider) => provider.getIsCurrentlyValid(workspace)) ??
      this.gradleProvider
    );
  }

  public async manageVendorLibraries(uri: vscode.Uri | undefined): Promise<void> {
    let workspace: vscode.WorkspaceFolder | undefined;
    if (uri) {
      workspace = vscode.workspace.getWorkspaceFolder(uri);
    }

    if (!workspace) {
      const prefsApi = this.externalApi.getPreferencesAPI();
      workspace = await prefsApi.getFirstOrSelectedWorkspace();
      if (!workspace || !prefsApi.getPreferences(workspace).getIsWPILibProject()) {
        vscode.window.showInformationMessage(
          i18n('message', 'Cannot install vendor libraries since this is not a WPILib project')
        );
        return;
      }
    }

    const qpArr: OptionQuickPick[] = [];

    qpArr.push(
      new OptionQuickPick(i18n('message', 'Manage current libraries'), async (wp) => {
        await this.manageCurrentLibraries(wp);
      })
    );
    qpArr.push(
      new OptionQuickPick(i18n('message', 'Check for updates (offline)'), async (wp) => {
        await this.checkForUpdates(wp, true);
      })
    );
    qpArr.push(
      new OptionQuickPick(i18n('message', 'Check for updates (online)'), async (wp) => {
        await this.checkForUpdates(wp, false);
      })
    );
    qpArr.push(
      new OptionQuickPick(i18n('message', 'Install new libraries (offline)'), async (wp) => {
        await this.installNewOffline(wp);
      })
    );
    qpArr.push(
      new OptionQuickPick(i18n('message', 'Install new libraries (online)'), async (wp) => {
        await this.installNewOnline(wp);
      })
    );

    const result = await vscode.window.showQuickPick(qpArr, {
      placeHolder: i18n('ui', 'Select an option'),
    });

    if (result) {
      await result.func(workspace);
    }
  }

  public async getCurrentlyInstalledLibraries(
    workspace: vscode.WorkspaceFolder
  ): Promise<IJsonDependency[]> {
    return this.gradleProvider.getInstalledDependencies(workspace);
  }

  private async manageCurrentLibraries(workspace: vscode.WorkspaceFolder): Promise<void> {
    const provider = this.getProvider(workspace);
    const { installed } = await provider.getSnapshot(workspace);

    if (installed.length === 0) {
      vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
      return;
    }

    const toRemove = await vscode.window.showQuickPick(
      installed.map((dep) => new DepQuickPick(dep.name, dep.key, dep.version)),
      {
        canPickMany: true,
        placeHolder: i18n('message', 'Check to uninstall libraries'),
      }
    );
    if (!toRemove || toRemove.length === 0) {
      return;
    }

    if (
      await provider.uninstall(
        workspace,
        toRemove.map((ti) => ti.key)
      )
    ) {
      await this.offerPostChangeAction(workspace, true);
    }
  }

  public async uninstall(workspace: vscode.WorkspaceFolder, keys: string[]): Promise<boolean> {
    return this.getProvider(workspace).uninstall(workspace, keys);
  }

  private async checkForUpdates(
    workspace: vscode.WorkspaceFolder,
    offline: boolean
  ): Promise<void> {
    const provider = this.getProvider(workspace);
    const updates: IDepUpdate[] = offline
      ? await provider.getOfflineUpdates(workspace)
      : await provider.getOnlineUpdates(workspace);

    if (updates.length === 0) {
      vscode.window.showInformationMessage(i18n('message', 'No updates available'));
      return;
    }

    const toUpdate = await vscode.window.showQuickPick(
      updates.map((up) => new DepQuickPick(up.name, up.key, up.newVersion, up.oldVersion)),
      {
        canPickMany: true,
        placeHolder: i18n('message', 'Check to update libraries'),
      }
    );
    if (!toUpdate) {
      return;
    }

    let anySucceeded = false;
    for (const ti of toUpdate) {
      const update = updates.find((up) => up.key === ti.key && up.newVersion === ti.version);
      if (update && (await provider.updateTo(workspace, update.key, update.newVersion))) {
        anySucceeded = true;
      } else {
        vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', ti.label));
      }
    }
    if (anySucceeded) {
      await this.offerPostChangeAction(workspace, true);
    }
  }

  private async installNewOffline(workspace: vscode.WorkspaceFolder): Promise<void> {
    if (await this.getProvider(workspace).installNewOffline(workspace)) {
      await this.offerPostChangeAction(workspace, true);
    }
  }

  private async installNewOnline(workspace: vscode.WorkspaceFolder): Promise<void> {
    const provider = this.getProvider(workspace);
    const labels = provider.getInputLabels();
    const prompt = i18n('message', 'Enter a vendor dependency {0}', labels.sourceName);
    const result = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: prompt,
      prompt,
    });

    if (result && (await provider.installFromInput(workspace, result))) {
      await this.offerPostChangeAction(workspace, true);
    }
  }

  public async offerPostChangeAction(
    workspace: vscode.WorkspaceFolder,
    modal = false
  ): Promise<boolean> {
    const actionName = this.getProvider(workspace).getPostChangeActionName();
    const buildRes = await vscode.window.showInformationMessage(
      i18n(
        'message',
        'It is recommended to run a "{0}" after a vendor update. Would you like to do this now?',
        actionName
      ),
      {
        modal: modal,
      },
      { title: i18n('ui', 'Yes') },
      { title: i18n('ui', 'No'), isCloseAffordance: true }
    );
    if (buildRes?.title === i18n('ui', 'Yes')) {
      await this.runPostChangeAction(workspace);
      return true;
    }
    return false;
  }

  public async runPostChangeAction(workspace: vscode.WorkspaceFolder): Promise<void> {
    await this.externalApi.getBuildTestAPI().buildCode(workspace, undefined);
    this.lastBuildTime = Date.now();
  }

  public getLastBuild(): number {
    return this.lastBuildTime;
  }

  public async getInstalled(workspace: vscode.WorkspaceFolder): Promise<IInstalledDep[]> {
    return (await this.getProvider(workspace).getSnapshot(workspace)).installed;
  }
}

const eventListener: vscode.EventEmitter<vscode.WorkspaceFolder> =
  new vscode.EventEmitter<vscode.WorkspaceFolder>();
export const onVendorDepsChanged: vscode.Event<vscode.WorkspaceFolder> = eventListener.event;
export function fireVendorDepsChanged(workspace: vscode.WorkspaceFolder): void {
  eventListener.fire(workspace);
}
