'use scrict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { promisifyReadDir } from './shared/generator';
import { promisifyReadFile } from './utilities';

interface IJsonDependency {
  name: string;
  version: string;
  uuid: string;
  jsonUrl: string;
}

class LibraryQuickPick implements vscode.QuickPickItem {
  public label: string;
  public func: () => Promise<void>;

  constructor(name: string, func: () => Promise<void>) {
    this.label = name;
    this.func = func;
  }
}

// tslint:disable-next-line:no-any
function isJsonDependency(arg: any): arg is IJsonDependency {
  const jsonDep = arg as IJsonDependency;

  return jsonDep.jsonUrl !== undefined && jsonDep.name !== undefined
         && jsonDep.uuid !== undefined && jsonDep.version !== undefined;
}

export class VendorLibraries {
  private externalApi: IExternalAPI;
  private userHomeFolder: string;
  private disposables: vscode.Disposable[] = [];

  constructor(externalApi: IExternalAPI, userHomeFolder: string) {
    this.externalApi = externalApi;
    this.userHomeFolder = userHomeFolder;

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.manageVendorLibs',
                          this.manageVendorLibraries, this));
  }

  public async manageVendorLibraries(): Promise<void> {
    const prefsApi = this.externalApi.getPreferencesAPI();
    const workspace = await prefsApi.getFirstOrSelectedWorkspace();
    if (workspace === undefined) {
      return;
    }

    const qpArr: LibraryQuickPick[] = [];

    qpArr.push(new LibraryQuickPick('Manage current libraries', this.manageCurrentLibraries));

    await vscode.window.showQuickPick(['Manage current libraries', 'Check for updates (offline)', 'Check for updates (online)',
                                       'Install new libraries (offline)', 'Install a new library (online)']);
  }

  private async manageCurrentLibraries(): Promise<void> {
    //
  }

  private getInstalledDependencies(workspace: vscode.WorkspaceFolder): Promise<IJsonDependency[]> {
    return this.getDependencies(path.join(workspace.uri.fsPath, 'vendordeps'));
  }

  private async getAvailableOfflineDependencies(workspace: vscode.WorkspaceFolder): Promise<IJsonDependency[]> {
    const availableDeps = await this.getDependencies(path.join(this.userHomeFolder, 'vendordeps'));
    const installedDeps = await this.getInstalledDependencies(workspace);

    const retDeps: IJsonDependency[] = [];

    for (const ad of availableDeps) {
      let foundGreater = false;
      for (const id of installedDeps) {
        if (ad.uuid === id.uuid) {
          if (ad.version <= id.version) {
            foundGreater = true;
          }
          break;
        }
      }
      if (!foundGreater) {
        retDeps.push(ad);
      }
    }

    return retDeps;
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
    const files = await promisifyReadDir(dir);

    const promises: Array<Promise<IJsonDependency | undefined>> = [];

    for (const file of files) {
      promises.push(this.readFile(file));
    }

    const results = await Promise.all(promises);

    return results.filter((x) => x !== undefined) as IJsonDependency[];
  }

  private dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
