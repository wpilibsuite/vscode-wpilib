'use scrict';

import * as fetch from 'node-fetch';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { logger } from './logger';
import { promisifyReadDir } from './shared/generator';
import { IJsonDependency, isJsonDependency, VendorLibrariesBase } from './shared/vendorlibrariesbase';
import { promisifyDeleteFile } from './utilities';
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
      this.description += ` (Old Version: ${oldVersion})`;
    }
    this.dep = dep;
  }
}

export class VendorLibraries extends VendorLibrariesBase {
  private disposables: vscode.Disposable[] = [];
  private externalApi: IExternalAPI;

  constructor(externalApi: IExternalAPI) {
    super(externalApi.getUtilitiesAPI());
    this.externalApi = externalApi;

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.manageVendorLibs', (uri: vscode.Uri | undefined) => {
      return this.manageVendorLibraries(uri);
    }, this));
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public async manageVendorLibraries(uri: vscode.Uri | undefined): Promise<void> {
    let workspace: vscode.WorkspaceFolder | undefined ;
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

    qpArr.push(new OptionQuickPick('Manage current libraries', async (wp) => {
      await this.manageCurrentLibraries(wp);
    }));
    qpArr.push(new OptionQuickPick('Check for updates (offline)', async (wp) => {
      await this.offlineUpdates(wp);
    }));
    qpArr.push(new OptionQuickPick('Check for updates (online)', async (wp) => {
      await this.onlineUpdates(wp);
    }));
    qpArr.push(new OptionQuickPick('Install new libraries (offline)', async (wp) => {
      await this.offlineNew(wp);
    }));
    qpArr.push(new OptionQuickPick('Install new library (online)', async (wp) => {
      await this.onlineNew(wp);
    }));

    const result = await vscode.window.showQuickPick(qpArr, {
      placeHolder: 'Select an option',
    });

    if (result) {
      await result.func(workspace);
    }
  }

  private async manageCurrentLibraries(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);

    if (installedDeps.length !== 0) {
      const arr = installedDeps.map((jdep) => {
        return new LibraryQuickPick(jdep);
      });
      const toRemove = await vscode.window.showQuickPick(arr, {
        canPickMany: true,
        placeHolder: 'Check to uninstall',
      });

      if (toRemove !== undefined) {
        const url = this.getWpVendorFolder(workspace);
        const files = await promisifyReadDir(url);
        for (const file of files) {
          const fullPath = path.join(url, file);
          const result = await this.readFile(fullPath);
          if (result !== undefined) {
            for (const ti of toRemove) {
              if (ti.dep.uuid === result.uuid) {
                await promisifyDeleteFile(fullPath);
              }
            }
          }
        }
      }
    } else {
      vscode.window.showInformationMessage('No dependencies installed');
    }
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
          placeHolder: 'Check to update',
        });

        if (toUpdate !== undefined) {
          for (const ti of toUpdate) {
            const success = await this.installDependency(ti.dep, this.getWpVendorFolder(workspace), true);
            if (success) {
              vscode.window.showInformationMessage('Successfully installed ' + ti.dep.name);
            } else {
              vscode.window.showErrorMessage('Failed to install ' + ti.dep.name);
            }
          }
        }
      } else {
        vscode.window.showInformationMessage('No updates available');
      }
    } else {
      vscode.window.showInformationMessage('No dependencies installed');
    }
  }

  private async onlineUpdates(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);

    if (installedDeps.length !== 0) {
      const promises = installedDeps.map((dep) => {
        return this.loadFileFromUrl(dep.jsonUrl);
      });
      const results = (await Promise.all(promises)).filter((x) => x !== undefined) as IJsonDependency[];
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
          placeHolder: 'Check to update',
        });

        if (toUpdate !== undefined) {
          for (const ti of toUpdate) {
            const success = await this.installDependency(ti.dep, this.getWpVendorFolder(workspace), true);
            if (success) {
              vscode.window.showInformationMessage('Successfully installed ' + ti.dep.name);
            } else {
              vscode.window.showErrorMessage('Failed to install ' + ti.dep.name);
            }
          }
        }
      } else {
        vscode.window.showInformationMessage('No updates available');
      }

    } else {
      vscode.window.showInformationMessage('No dependencies installed');
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
        placeHolder: 'Check to install',
      });

      if (toInstall !== undefined) {
        for (const ti of toInstall) {
          const success = await this.installDependency(ti.dep, this.getWpVendorFolder(workspace), true);
          if (success) {
            vscode.window.showInformationMessage('Successfully installed ' + ti.dep.name);
          } else {
            vscode.window.showErrorMessage('Failed to install ' + ti.dep.name);
          }
        }
      }
    } else {
      vscode.window.showInformationMessage('No new dependencies available');
    }
  }

  private async onlineNew(workspace: vscode.WorkspaceFolder): Promise<void> {
    const result = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: 'Enter a vendor file URL (get from vendor)',
      prompt: 'Enter a vendor file URL (get from vendor)',
    });

    if (result) {
      const file = await this.loadFileFromUrl(result);
      if (file !== undefined) {
        // Load existing libraries
        const existing = await this.getInstalledDependencies(workspace);

        for (const dep of existing) {
          if (dep.uuid === file.uuid) {
            vscode.window.showWarningMessage('Library already installed');
            return;
          }
        }

        const success = await this.installDependency(file, this.getWpVendorFolder(workspace), true);
        if (success) {
          vscode.window.showInformationMessage('Successfully installed ' + file.name);
        } else {
          vscode.window.showErrorMessage('Failed to install ' + file.name);
        }
      }
    }
  }

  private async loadFileFromUrl(url: string): Promise<IJsonDependency | undefined> {
    try {
      const response = await fetch.default(url, {
        timeout: 5000,
      });
      if (response === undefined) {
        return undefined;
      }
      if (response.status >= 200 && response.status <= 300) {
        try {
          const text = await response.text();
          const json = JSON.parse(text);
          if (isJsonDependency(json)) {
            return json;
          } else {
            return undefined;
          }
        } catch {
          return undefined;
        }
      } else {
        return undefined;
      }
    } catch (err) {
      logger.log('Error fetching file', err);
      return undefined;
    }
  }

  private getWpVendorFolder(workspace: vscode.WorkspaceFolder): string {
    return this.getVendorFolder(workspace.uri.fsPath);
  }

  private getInstalledDependencies(workspace: vscode.WorkspaceFolder): Promise<IJsonDependency[]> {
    return this.getDependencies(this.getWpVendorFolder(workspace));
  }
}

const eventListener: vscode.EventEmitter<vscode.WorkspaceFolder> = new vscode.EventEmitter<vscode.WorkspaceFolder>();
export const onVendorDepsChanged: vscode.Event<vscode.WorkspaceFolder> = eventListener.event;
export function fireVendorDepsChanged(workspace: vscode.WorkspaceFolder): void {
  eventListener.fire(workspace);
}
