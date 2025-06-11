'use scrict';

import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from './logger';
import { IExternalAPI } from 'vscode-wpilibapi';
import { localize as i18n } from './locale';
import { IJsonDependency, VendorLibrariesBase } from './shared/vendorlibrariesbase';
import { deleteFileAsync, readdirAsync } from './utilities';
import { isNewerVersion } from './versions';

class OptionQuickPick implements vscode.QuickPickItem {
  public label: string;
  public func: (workspace: vscode.WorkspaceFolder) => Promise<void>;

  constructor(name: string, func: (workspace: vscode.WorkspaceFolder) => Promise<void>) {
    this.label = name;
    this.func = func;
  }
}

class LibraryQuickPick implements vscode.QuickPickItem {
  public label: string;
  public dep: IJsonDependency;
  public description: string;

  constructor(dep: IJsonDependency, oldVersion?: string) {
    this.label = dep.name;
    this.description = dep.version;
    if (oldVersion !== undefined) {
      this.description += ` (${i18n('ui', 'Old Version: {0}', oldVersion)})`;
    }
    this.dep = dep;
  }
}

export class VendorLibraries extends VendorLibrariesBase {
  private disposables: vscode.Disposable[] = [];
  private externalApi: IExternalAPI;
  private lastBuildTime = 1;

  constructor(externalApi: IExternalAPI) {
    super(externalApi.getUtilitiesAPI());
    this.externalApi = externalApi;

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

  public async manageVendorLibraries(uri: vscode.Uri | undefined): Promise<void> {
    let workspace: vscode.WorkspaceFolder | undefined;
    if (uri !== undefined) {
      workspace = vscode.workspace.getWorkspaceFolder(uri);
    }

    if (workspace === undefined) {
      const prefsApi = this.externalApi.getPreferencesAPI();
      workspace = await prefsApi.getFirstOrSelectedWorkspace();
      if (workspace === undefined) {
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
        await this.offlineUpdates(wp);
      })
    );
    qpArr.push(
      new OptionQuickPick(i18n('message', 'Check for updates (online)'), async (wp) => {
        await this.onlineUpdates(wp);
      })
    );
    qpArr.push(
      new OptionQuickPick(i18n('message', 'Install new libraries (offline)'), async (wp) => {
        await this.offlineNew(wp);
      })
    );
    qpArr.push(
      new OptionQuickPick(i18n('message', 'Install new libraries (online)'), async (wp) => {
        await this.onlineNew(wp);
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
    return this.getInstalledDependencies(workspace);
  }

  public async getJsonDepURL(url: string): Promise<IJsonDependency> {
    return this.loadFileFromUrl(url);
  }

  private async manageCurrentLibraries(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);
    const deps: IJsonDependency[] = [];

    if (installedDeps.length !== 0) {
      const arr = installedDeps.map((jdep) => {
        return new LibraryQuickPick(jdep);
      });
      const toRemove = await vscode.window.showQuickPick(arr, {
        canPickMany: true,
        placeHolder: i18n('message', 'Check to uninstall libraries'),
      });

      if (toRemove !== undefined) {
        for (const ti of toRemove) {
          deps.push(ti.dep);
        }
      }

      void this.uninstallVendorLibraries(deps, workspace);
    } else {
      vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
    }
  }

  public async uninstallVendorLibraries(
    toRemove: IJsonDependency[] | undefined,
    workspace: vscode.WorkspaceFolder
  ): Promise<boolean> {
    let anySucceeded = false;
    if (toRemove !== undefined) {
      const url = this.getWpVendorFolder(workspace);
      const files = await readdirAsync(url);
      for (const file of files) {
        const fullPath = path.join(url, file);
        const result = await this.readFile(fullPath);
        if (result !== undefined) {
          for (const ti of toRemove) {
            if (ti.uuid === result.uuid) {
              await deleteFileAsync(fullPath);
              anySucceeded = true;
            }
          }
        }
      }
    }
    return anySucceeded;
  }

  private async offlineUpdates(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);

    if (installedDeps.length !== 0) {
      const availableDeps = await this.getHomeDirDeps();
      const updatableDeps = [];
      for (const ad of availableDeps) {
        for (const id of installedDeps) {
          if (id.uuid === ad.uuid) {
            // Maybe update available
            if (isNewerVersion(ad.version, id.version)) {
              updatableDeps.push(new LibraryQuickPick(ad));
            }
            continue;
          }
        }
      }
      if (updatableDeps.length !== 0) {
        const toUpdate = await vscode.window.showQuickPick(updatableDeps, {
          canPickMany: true,
          placeHolder: i18n('message', 'Check to update libraries'),
        });

        if (toUpdate !== undefined) {
          let anySucceeded = false;
          for (const ti of toUpdate) {
            const success = await this.installDependency(
              ti.dep,
              this.getWpVendorFolder(workspace),
              true
            );
            if (!success) {
              vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', ti.dep.name));
            } else {
              anySucceeded = true;
            }
          }
          if (anySucceeded) {
            this.offerBuild(workspace, true);
          }
        }
      } else {
        vscode.window.showInformationMessage(i18n('message', 'No updates available'));
      }
    } else {
      vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
    }
  }

  private async onlineUpdates(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);

    if (installedDeps.length !== 0) {
      const promises = installedDeps.map(async (dep) => {
        if (dep.jsonUrl === undefined || dep.jsonUrl.length === 0) {
          return undefined;
        }
        try {
          return await this.loadFileFromUrl(dep.jsonUrl);
        } catch (err) {
          logger.log('Error fetching file', err);
          return undefined;
        }
      });
      const results = (await Promise.all(promises)).filter(
        (x) => x !== undefined
      ) as IJsonDependency[];
      const updatable = [];
      for (const newDep of results) {
        for (const oldDep of installedDeps) {
          if (newDep.uuid === oldDep.uuid) {
            if (isNewerVersion(newDep.version, oldDep.version)) {
              updatable.push(new LibraryQuickPick(newDep, oldDep.version));
            }
            break;
          }
        }
      }

      if (updatable.length !== 0) {
        const toUpdate = await vscode.window.showQuickPick(updatable, {
          canPickMany: true,
          placeHolder: i18n('message', 'Check to update libraries'),
        });

        if (toUpdate !== undefined) {
          let anySucceeded = false;
          for (const ti of toUpdate) {
            const success = await this.installDependency(
              ti.dep,
              this.getWpVendorFolder(workspace),
              true
            );
            if (!success) {
              vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', ti.dep.name));
            } else {
              anySucceeded = true;
            }
          }
          if (anySucceeded) {
            this.offerBuild(workspace, true);
          }
        }
      } else {
        vscode.window.showInformationMessage(i18n('message', 'No updates available'));
      }
    } else {
      vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
    }
  }

  private async offlineNew(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);

    const availableDeps = await this.getHomeDirDeps();
    const updatableDeps = [];
    for (const ad of availableDeps) {
      let foundDep = false;
      for (const id of installedDeps) {
        if (id.uuid === ad.uuid) {
          foundDep = true;
          continue;
        }
      }
      if (!foundDep) {
        updatableDeps.push(new LibraryQuickPick(ad));
      }
    }
    if (updatableDeps.length !== 0) {
      const toInstall = await vscode.window.showQuickPick(updatableDeps, {
        canPickMany: true,
        placeHolder: i18n('message', 'Check to install libraries'),
      });

      if (toInstall !== undefined) {
        let anySucceeded = false;
        for (const ti of toInstall) {
          const success = await this.installDependency(
            ti.dep,
            this.getWpVendorFolder(workspace),
            true
          );
          if (!success) {
            vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', ti.dep.name));
          } else {
            anySucceeded = true;
          }
        }
        if (anySucceeded) {
          this.offerBuild(workspace, true);
        }
      }
    } else {
      vscode.window.showInformationMessage(i18n('message', 'No new dependencies available'));
    }
  }

  private async onlineNew(workspace: vscode.WorkspaceFolder): Promise<void> {
    const result = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: i18n('message', 'Enter a vendor file URL (get from vendor)'),
      prompt: i18n('message', 'Enter a vendor file URL (get from vendor)'),
    });

    if (result) {
      const file = await this.loadFileFromUrl(result);
      // Load existing libraries
      const existing = await this.getInstalledDependencies(workspace);

      for (const dep of existing) {
        if (dep.uuid === file.uuid) {
          vscode.window.showWarningMessage(i18n('message', 'Library already installed'));
          return;
        }
      }

      const success = await this.installDependency(file, this.getWpVendorFolder(workspace), true);
      if (success) {
        this.offerBuild(workspace, true);
      } else {
        vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', file.name));
      }
    }
  }

  public getWpVendorFolder(workspace: vscode.WorkspaceFolder): string {
    return this.getVendorFolder(workspace.uri.fsPath);
  }

  private getInstalledDependencies(workspace: vscode.WorkspaceFolder): Promise<IJsonDependency[]> {
    return this.getDependencies(this.getWpVendorFolder(workspace));
  }

  public async offerBuild(workspace: vscode.WorkspaceFolder, modal = false): Promise<boolean> {
    const buildRes = await vscode.window.showInformationMessage(
      i18n(
        'message',
        'It is recommended to run a "Build" after a vendor update. ' +
          'Would you like to do this now?'
      ),
      {
        modal: modal,
      },
      { title: i18n('ui', 'Yes') },
      { title: i18n('ui', 'No'), isCloseAffordance: true }
    );
    if (buildRes?.title === i18n('ui', 'Yes')) {
      await this.externalApi.getBuildTestAPI().buildCode(workspace, undefined);
      this.lastBuildTime = Date.now();
      return true;
    }
    return false;
  }

  public getLastBuild(): number {
    return this.lastBuildTime;
  }
}

const eventListener: vscode.EventEmitter<vscode.WorkspaceFolder> =
  new vscode.EventEmitter<vscode.WorkspaceFolder>();
export const onVendorDepsChanged: vscode.Event<vscode.WorkspaceFolder> = eventListener.event;
export function fireVendorDepsChanged(workspace: vscode.WorkspaceFolder): void {
  eventListener.fire(workspace);
}
