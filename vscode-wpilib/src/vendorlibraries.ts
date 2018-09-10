'use scrict';

import fetch from 'node-fetch';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { promisifyMkdirp, promisifyReadDir } from './shared/generator';
import { getHomeDir, promisifyDeleteFile, promisifyExists, promisifyReadFile, promisifyWriteFile } from './utilities';

interface IJsonDependency {
  name: string;
  version: string;
  uuid: string;
  jsonUrl: string;
  fileName: string;
}

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

// tslint:disable-next-line:no-any
function isJsonDependency(arg: any): arg is IJsonDependency {
  const jsonDep = arg as IJsonDependency;

  return jsonDep.jsonUrl !== undefined && jsonDep.name !== undefined
         && jsonDep.uuid !== undefined && jsonDep.version !== undefined;
}

export class VendorLibraries {
  private year: string;
  private externalApi: IExternalAPI;
  private disposables: vscode.Disposable[] = [];

  constructor(year: string, externalApi: IExternalAPI) {
    this.externalApi = externalApi;
    this.year = year;

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
      await vscode.window.showInformationMessage('No dependencies installed');
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
            if (ad.version > id.version) {
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
            await this.installDependency(ti.dep, this.getWpVendorFolder(workspace), true);
          }
        }
      } else {
        await vscode.window.showInformationMessage('No updates available');
      }
    } else {
      await vscode.window.showInformationMessage('No dependencies installed');
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
            if (newDep.version > oldDep.version) {
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
            await this.installDependency(ti.dep, this.getWpVendorFolder(workspace), true);
          }
        }
      } else {
        await vscode.window.showInformationMessage('No updates available');
      }

    } else {
      await vscode.window.showInformationMessage('No dependencies installed');
    }
  }

  private async offlineNew(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);

    if (installedDeps.length !== 0) {
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
            await this.installDependency(ti.dep, this.getWpVendorFolder(workspace), true);
          }
        }
      } else {
        await vscode.window.showInformationMessage('No new dependencies available');
      }
    } else {
      await vscode.window.showInformationMessage('No dependencies installed');
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
            await vscode.window.showWarningMessage('Library already installed');
            return;
          }
        }

        await this.installDependency(file, this.getWpVendorFolder(workspace), true);
      }
    }
  }

  private async loadFileFromUrl(url: string): Promise<IJsonDependency | undefined> {
    try {
      const response = await fetch(url, {
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
    } catch {
      return undefined;
    }
  }

  private getWpVendorFolder(workspace: vscode.WorkspaceFolder): string {
    return path.join(workspace.uri.fsPath, 'vendordeps');
  }

  private getInstalledDependencies(workspace: vscode.WorkspaceFolder): Promise<IJsonDependency[]> {
    return this.getDependencies(this.getWpVendorFolder(workspace));
  }

  private getHomeDirDeps(): Promise<IJsonDependency[]> {
    return this.getDependencies(path.join(getHomeDir(this.year), 'vendordeps'));
  }

  private async installDependency(dep: IJsonDependency, url: string, override: boolean): Promise<boolean> {
    const dirExists = await promisifyExists(url);

    if (!dirExists) {
      await promisifyMkdirp(url);
      // Directly write file
      await promisifyWriteFile(path.join(url, dep.fileName), JSON.stringify(dep, null, 4));
      return true;
    }

    const files = await promisifyReadDir(url);

    for (const file of files) {
      const fullPath = path.join(url, file);
      const result = await this.readFile(fullPath);
      if (result !== undefined) {
        if (result.uuid === dep.uuid) {
          if (override) {
            await promisifyDeleteFile(fullPath);
            break;
          } else {
            return false;
          }
        }
      }
    }

    await promisifyWriteFile(path.join(url, dep.fileName), JSON.stringify(dep, null, 4));
    return true;
  }

  private async readFile(file: string): Promise<IJsonDependency | undefined> {
    const jsonContents = await promisifyReadFile(file);
    const dep = JSON.parse(jsonContents);

    if (isJsonDependency(dep)) {
      return dep;
    }

    return undefined;
  }

  private async getDependencies(dir: string): Promise<IJsonDependency[]> {
    try {
      const files = await promisifyReadDir(dir);

      const promises: Array<Promise<IJsonDependency | undefined>> = [];

      for (const file of files) {
        promises.push(this.readFile(path.join(dir, file)));
      }

      const results = await Promise.all(promises);

      return results.filter((x) => x !== undefined) as IJsonDependency[];
    } catch (err) {
      return [];
    }
  }
}
