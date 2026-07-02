'use strict';

import { readdir, unlink } from 'fs/promises';
import * as cp from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { IExecuteAPI, IExternalAPI } from './api';
import { localize as i18n } from './locale';
import { logger } from './logger';
import {
  getDependencies,
  getHomeDirDeps,
  IJsonDependency,
  installDependency,
  getVersions,
  loadFileFromUrl,
  parseVendordepJson,
  addPythonDep,
  getPythonDeps,
  parseRequirement,
  removePythonDep,
  getComponents,
  IRequires,
  getInstalledVersion,
  updateVersion,
  installNewRequirement,
} from './shared/vendorlibrariesbase';
import { isNewerVersion } from './versions';
import { isComponent } from './shared/projectGeneratorUtils';
import { getWPILibYear } from './shared/utilitiesapi';

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
    if (oldVersion) {
      this.description += ` (${i18n('ui', 'Old Version: {0}', oldVersion)})`;
    }
    this.dep = dep;
  }
}

class LibraryQuickPickPy implements vscode.QuickPickItem {
  public label: string;
  public dep: string;
  public description: string;
  public oldVersion?: string;

  constructor(dep: string, version?: string, oldVersion?: string) {
    this.label = dep;
    if (version) this.description = version;
    else this.description = '';
    if (oldVersion) {
      this.oldVersion = oldVersion;
    }
    this.dep = dep;
  }
}

export class VendorLibraries {
  private disposables: vscode.Disposable[] = [];
  private externalApi: IExternalAPI;
  private executeApi: IExecuteAPI;
  private lastBuildTime = 1;
  private requirements: IRequires[] = [];

  constructor(externalApi: IExternalAPI) {
    this.externalApi = externalApi;
    this.executeApi = externalApi.getExecuteAPI();

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

  public async getCurrentlyInstalledPythonLibraries(workspace: vscode.WorkspaceFolder) {
    // let components = await getComponents(workspace.uri.fsPath);
    // let requirements = await getVendorPackageNames(workspace.uri.fsPath);
    return await getPythonDeps(workspace.uri.fsPath);
  }

  public async getPythonRequirements() {
    let ret: string[] = [];
    for (const r of this.requirements) {
      ret.push(r.name);
    }
    return ret;
  }

  public async getJsonDepURL(url: string): Promise<IJsonDependency> {
    return loadFileFromUrl(url);
  }

  private async manageCurrentLibraries(workspace: vscode.WorkspaceFolder): Promise<void> {
    if (
      this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() ===
      'python'
    ) {
      const installedDeps = await this.getCurrentlyInstalledPythonLibraries(workspace);
      const deps: string[] = [];

      if (installedDeps.length !== 0) {
        const arr = installedDeps.map((dep) => {
          return new LibraryQuickPickPy(dep);
        });
        const toRemove = await vscode.window.showQuickPick(arr, {
          canPickMany: true,
          placeHolder: i18n('message', 'Check to uninstall libraries'),
        });

        if (toRemove) {
          for (const ti of toRemove) {
            deps.push(ti.dep);
          }
        }

        void this.uninstallPythonVendorLibraries(deps, workspace);
      } else {
        vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
      }
    } else {
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

        if (toRemove) {
          for (const ti of toRemove) {
            deps.push(ti.dep);
          }
        }

        void this.uninstallVendorLibraries(deps, workspace);
      } else {
        vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
      }
    }
  }

  public async uninstallVendorLibraries(
    toRemove: IJsonDependency[] | undefined,
    workspace: vscode.WorkspaceFolder
  ): Promise<boolean> {
    let anySucceeded = false;
    if (toRemove && toRemove.length > 0) {
      const url = this.getWpVendorFolder(workspace);
      const files = await readdir(url);
      for (const file of files) {
        const fullPath = path.join(url, file);
        const result = await parseVendordepJson(fullPath);
        if (result) {
          for (const ti of toRemove) {
            if (result.uuid === ti.uuid) {
              try {
                await unlink(fullPath);
                anySucceeded = true;
                // Found and deleted, break from inner loop
                break;
              } catch (err) {
                logger.error('Failed to delete vendor dependency file', {
                  file: fullPath,
                  error: err,
                });
              }
            }
          }
        }
      }
    }
    return anySucceeded;
  }

  public async syncRequirements(workspace: vscode.WorkspaceFolder): Promise<void> {
    if (this.requirements.length <= 0) return;
    let pipList = cp.execSync('uv pip list', { cwd: workspace.uri.fsPath, encoding: 'utf8' });
    const installedReqs: IRequires[] = [];
    const remove: IRequires[] = [];
    for (const r of this.requirements) {
      if (pipList.indexOf(r.name) !== -1) {
        installedReqs.push(r);
      } else {
        remove.push(r);
      }
    }
    await removePythonDep([], remove, workspace.uri.fsPath);
    this.requirements = installedReqs;
  }

  public async addRequirement(
    pkg: string,
    workspace: vscode.WorkspaceFolder,
    version?: string,
    installed?: boolean
  ) {
    if (!installed) {
      let validPackage: IRequires | undefined;
      if (version) {
        let v = version.indexOf(' (prerelease)');
        if (getWPILibYear().indexOf(version.substring(0, 4)) === -1) {
          const res = await vscode.window.showInformationMessage(
            i18n(
              'message',
              'This package may not be compatible with the current WPILib Version, would you still like to install?'
            ),
            { modal: true },
            i18n('ui', 'Yes'),
            i18n('ui', 'No')
          );
          if (res === i18n('ui', 'Yes')) {
            if (v !== -1)
              validPackage = await installNewRequirement(
                pkg,
                workspace,
                this.executeApi,
                version.substring(0, v)
              );
            else
              validPackage = await installNewRequirement(pkg, workspace, this.executeApi, version);
          }
        } else {
          if (v !== -1)
            validPackage = await installNewRequirement(
              pkg,
              workspace,
              this.executeApi,
              version.substring(0, v)
            );
          else validPackage = await installNewRequirement(pkg, workspace, this.executeApi, version);
        }
      } else validPackage = await installNewRequirement(pkg, workspace, this.executeApi);
      if (!validPackage) return undefined;
      let req = validPackage;
      let versions = validPackage.availableVersions;
      let installedVersion = validPackage.version;
      for (const v of versions) {
        if (
          installedVersion &&
          v.indexOf(installedVersion) !== -1 &&
          v.indexOf(' (prerelease)') !== -1
        ) {
          installedVersion += ' (prerelease)';
        }
      }
      if (installedVersion) req.version = installedVersion;
      // If the requirement has a version but does not have a specifier, default to ~=
      if (installedVersion && !req.specifier) req.specifier = '~=';
      if (version && versions.indexOf(version) !== -1) req.version = version;
      req.availableVersions = versions;
      this.requirements.push(req);
      return req;
    } else {
      let add = true;
      for (const r of this.requirements) {
        if (r.name === pkg) {
          add = false;
          if (r.version !== version) {
            r.version = version;
            await updateVersion(r, workspace.uri.fsPath);
          }
          return r;
        }
      }
      if (add) {
        let toPush: IRequires;
        if (version) toPush = { name: pkg, version: version, availableVersions: [version] };
        else toPush = { name: pkg, availableVersions: [] };
        this.requirements.push(toPush);
        await addPythonDep([], [toPush], workspace.uri.fsPath);
        return toPush;
      } else return undefined;
    }
  }

  public async updateVersion(pkg: IRequires, version: string, workspace: vscode.WorkspaceFolder) {
    let req: IRequires | undefined;
    for (const r of this.requirements) {
      if (r.name === pkg.name) {
        req = r;
        break;
      }
    }
    if (req && req.version) {
      req.version = version;
      await updateVersion(req, workspace.uri.fsPath);
      return req;
    }
    return await this.addRequirement(pkg.name, workspace, version);
  }

  public async addRequirements(pkgs: string[], workspace: string) {
    let ret: IRequires[] = [];
    for (const pkg of pkgs) {
      let req = await parseRequirement(pkg);
      let versions = getVersions(pkg, workspace);
      let installedVersion = await getInstalledVersion(pkg, workspace);
      if (installedVersion) req.version = installedVersion;
      req.availableVersions = versions;
      this.requirements.push(req);
      ret.push(req);
    }
    return ret;
  }

  public async getIRequires(
    pkg: string,
    workspace: vscode.WorkspaceFolder,
    version?: string
  ): Promise<IRequires | undefined> {
    await this.syncRequirements(workspace);
    if (version) {
      let pkgReq = await parseRequirement(pkg);

      for (const r of this.requirements) {
        if (r.name === pkgReq.name) {
          if (r.version === pkgReq.version) return r;
          if (r.availableVersions) {
            for (const v of r.availableVersions) {
              if (v === pkgReq.version) {
                let req = await this.updateVersion(r, pkgReq.version, workspace);
                if (req) return req;
              }
            }
          }
        }
      }
    }
    let pkgName = (await parseRequirement(pkg)).name;
    for (const r of this.requirements) {
      if (r.name === pkgName) {
        return r;
      }
    }
    let addedReq = await this.addRequirement(pkg, workspace);
    if (addedReq) return addedReq;
    return undefined;
  }

  public async uninstallPythonVendorLibraries(
    pkg: string[],
    workspace: vscode.WorkspaceFolder
  ): Promise<boolean> {
    let succeed = false;
    if (pkg.length > 0) {
      const components = await getComponents(workspace.uri.fsPath);
      let removeComponents: string[] = [];
      let removeRequires: IRequires[] = [];
      for (const p of pkg) {
        let removed = false;
        for (const c of components) {
          if (c === p) {
            removeComponents.push(p);
            removed = true;
            continue;
          }
        }
        if (!removed) {
          let req = await parseRequirement(p);
          let toRemove = await this.getIRequires(req.name, workspace, req.version);
          if (toRemove) removeRequires.push(toRemove);
        }
      }
      await removePythonDep(removeComponents, removeRequires, workspace.uri.fsPath);
    }
    return succeed;
  }

  public async installPythonDependency(
    deps: string[],
    workspace: vscode.WorkspaceFolder
  ): Promise<boolean> {
    try {
      if (deps.length > 0) {
        let requires: IRequires[] = [];
        let components: string[] = [];
        for (const d of deps) {
          if (isComponent(d)) {
            components.push(d);
          } else {
            let req = await parseRequirement(d);
            let toPush = await this.getIRequires(req.name, workspace, req.version);
            if (toPush) requires.push(toPush);
          }
        }
        // Returns true if toml file was updated without errors
        return await addPythonDep(components, requires, workspace.uri.fsPath);
      }
      // No deps to install, so all were installed
      return true;
    } catch {
      return false;
    }
  }

  private async offlineUpdates(workspace: vscode.WorkspaceFolder): Promise<void> {
    if (
      this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() ===
      'python'
    ) {
      const installedDeps = await this.getCurrentlyInstalledPythonLibraries(workspace);
      if (installedDeps.length !== 0) {
        const updatableDeps: LibraryQuickPickPy[] = [];
        for (const dep of installedDeps) {
          if (isComponent(dep)) {
            continue;
          } else {
            for (const r of this.requirements) {
              if (r.name === dep) {
                if (r.version && r.availableVersions) {
                  // Because of the way versions are added, the newest version is added first,
                  // so as soon as the current version is found, it stops adding version options
                  for (const v of r.availableVersions) {
                    if (v === r.version) {
                      break;
                    } else if (isNewerVersion(v, r.version)) {
                      // TODO: should we add logic to not include prereleases?
                      updatableDeps.push(new LibraryQuickPickPy(r.name, v, r.version));
                    }
                  }
                }
              }
            }
          }
        }
        if (updatableDeps.length !== 0) {
          const toUpdate = await vscode.window.showQuickPick(updatableDeps, {
            canPickMany: true,
            placeHolder: i18n('message', 'Check to update libraries'),
          });

          if (toUpdate) {
            let anySucceeded = false;
            for (const ti of toUpdate) {
              const success = await this.updateVersion(
                (await this.getIRequires(ti.dep, workspace, ti.description)) as IRequires,
                ti.description as string,
                workspace
              );
              if (!success) {
                vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', ti.dep));
              } else {
                anySucceeded = true;
              }
            }
            if (anySucceeded) {
              vscode.window.showInformationMessage(
                i18n(
                  'message',
                  'Updated dependencies, make sure to connect to the internet to run sync before deploying code to your robot'
                )
              );
            }
          }
        } else {
          vscode.window.showInformationMessage(i18n('message', 'No updates available'));
        }
      } else {
        vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
      }
    } else {
      const installedDeps = await this.getInstalledDependencies(workspace);

      if (installedDeps.length !== 0) {
        const availableDeps = await getHomeDirDeps();
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

          if (toUpdate) {
            let anySucceeded = false;
            for (const ti of toUpdate) {
              const success = await installDependency(
                ti.dep,
                this.getWpVendorFolder(workspace),
                true
              );
              if (!success) {
                vscode.window.showErrorMessage(
                  i18n('message', 'Failed to install {0}', ti.dep.name)
                );
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
  }

  private async onlineUpdates(workspace: vscode.WorkspaceFolder): Promise<void> {
    if (
      this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() ===
      'python'
    ) {
      const installedDeps = await this.getCurrentlyInstalledPythonLibraries(workspace);
      const availableUpdates: LibraryQuickPickPy[] = [];
      for (const d of installedDeps) {
        if (!isComponent(d)) {
          let req = await this.getIRequires(d, workspace);
          if (req) {
            let versions = getVersions(req.name, workspace.uri.fsPath);
            if (!req.version)
              req.version = (await getInstalledVersion(req.name, workspace.uri.fsPath)) as string;
            for (let i = versions.length - 1; i >= 0; i--) {
              if (versions[i] === req.version) continue;
              if (isNewerVersion(versions[i], req.version)) {
                availableUpdates.push(new LibraryQuickPickPy(req.name, versions[i]));
                break;
              }
            }
          }
        }
      }
      if (availableUpdates.length > 0) {
        const toUpdate = await vscode.window.showQuickPick(availableUpdates, {
          canPickMany: true,
          placeHolder: i18n('message', 'Check to update libraries'),
        });

        if (toUpdate) {
          let anySucceeded = false;
          for (const ti of toUpdate) {
            const success = await this.updateVersion(
              (await this.getIRequires(ti.dep, workspace, ti.description)) as IRequires,
              ti.description as string,
              workspace
            );
            if (!success) {
              vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', ti.dep));
            } else {
              anySucceeded = true;
            }
          }
          if (anySucceeded) {
            await this.offerSync(workspace, true);
          }
        } else {
          vscode.window.showInformationMessage(i18n('message', 'No updates available'));
        }
      } else {
        vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
      }
    } else {
      const installedDeps = await this.getInstalledDependencies(workspace);

      if (installedDeps.length !== 0) {
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

          if (toUpdate) {
            let anySucceeded = false;
            for (const ti of toUpdate) {
              const success = await installDependency(
                ti.dep,
                this.getWpVendorFolder(workspace),
                true
              );
              if (!success) {
                vscode.window.showErrorMessage(
                  i18n('message', 'Failed to install {0}', ti.dep.name)
                );
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
  }

  private async offlineNew(workspace: vscode.WorkspaceFolder): Promise<void> {
    if (
      this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() ===
      'python'
    ) {
      const oldProject = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Downloads')),
        filters: {
          'Wheel File': ['whl'],
        },
        openLabel: 'Select a Project',
      });
      if (!oldProject || oldProject.length !== 1) {
        return;
      }
      try {
        await this.syncRequirements(workspace);
        const packageFile = oldProject[0].fsPath;
        let pkg = path.basename(packageFile, path.extname(packageFile));
        let packageName = pkg.substring(0, pkg.indexOf('-'));
        pkg = pkg.substring(packageName.length + 1);
        packageName = packageName.replace('_', '-');
        const packageVersion = pkg.substring(0, pkg.indexOf('-'));
        if (getWPILibYear().indexOf(packageVersion.substring(0, 4)) === -1) {
          const res = await vscode.window.showInformationMessage(
            i18n(
              'message',
              'This package is not compatible with the current WPILib Version, would you still like to install?'
            ),
            { modal: true },
            i18n('ui', 'Yes'),
            i18n('ui', 'No')
          );
          if (res === i18n('ui', 'Yes')) {
            let cmd = `uv pip install "${packageFile}" --offline --prerelease=allow`;
            let num = await this.externalApi
              .getExecuteAPI()
              .executeCommand(
                cmd,
                'Offline Install Python Package',
                workspace.uri.fsPath,
                workspace
              );
            if (num === 0) {
              await this.addRequirement(packageName, workspace, packageVersion, true);
            }
          }
        } else {
          let cmd = `uv pip install "${packageFile}" --offline --prerelease=allow`;
          let num = await this.externalApi
            .getExecuteAPI()
            .executeCommand(cmd, 'Offline Install Python Package', workspace.uri.fsPath, workspace);
          if (num === 0) {
            await this.addRequirement(packageName, workspace, packageVersion, true);
          }
        }
      } catch (err) {
        vscode.window.showErrorMessage('Error with offline install: ' + err);
      }
    } else {
      const installedDeps = await this.getInstalledDependencies(workspace);

      const availableDeps = await getHomeDirDeps();
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

        if (toInstall) {
          let anySucceeded = false;
          for (const ti of toInstall) {
            const success = await installDependency(
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
  }

  private async onlineNew(workspace: vscode.WorkspaceFolder): Promise<void> {
    if (
      this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() ===
      'python'
    ) {
      const result = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: i18n(
          'message',
          'Enter a vendor Python Package name (get from vendor or pypi.org)'
        ),
        prompt: i18n('message', 'Enter a vendor Python Package name (get from vendor or pypi.org)'),
      });

      if (result) {
        if (isComponent(result)) {
          await addPythonDep([result], [], workspace.uri.fsPath);
          vscode.window.showInformationMessage(
            i18n('message', 'Successfully installed/updated library!')
          );
          return;
        }
        const dep = await this.getIRequires(result, workspace);
        if (dep) {
          await addPythonDep([], [dep], workspace.uri.fsPath);
          vscode.window.showInformationMessage(
            i18n('message', 'Successfully installed/updated library!')
          );
        }
      }
    } else {
      const result = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: i18n('message', 'Enter a vendor file URL (get from vendor)'),
        prompt: i18n('message', 'Enter a vendor file URL (get from vendor)'),
      });

      if (result) {
        const file = await loadFileFromUrl(result);
        // Load existing libraries
        const existing = await this.getInstalledDependencies(workspace);

        for (const dep of existing) {
          if (dep.uuid === file.uuid) {
            vscode.window.showWarningMessage(i18n('message', 'Library already installed'));
            return;
          }
        }

        const success = await installDependency(file, this.getWpVendorFolder(workspace), true);
        if (success) {
          this.offerBuild(workspace, true);
        } else {
          vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', file.name));
        }
      }
    }
  }

  public getWpVendorFolder(workspace: vscode.WorkspaceFolder): string {
    return path.join(workspace.uri.fsPath, 'vendordeps');
  }

  private getInstalledDependencies(workspace: vscode.WorkspaceFolder): Promise<IJsonDependency[]> {
    return getDependencies(this.getWpVendorFolder(workspace));
  }

  public async offerBuild(workspace: vscode.WorkspaceFolder, modal = false): Promise<boolean> {
    if (
      this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() ===
      'python'
    )
      return false;
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

  public async offerSync(workspace: vscode.WorkspaceFolder, modal = false): Promise<boolean> {
    if (
      this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() !==
      'python'
    )
      return false;
    const buildRes = await vscode.window.showInformationMessage(
      i18n(
        'message',
        'It is recommended to run a "Sync" after a vendor update. ' +
          'Would you like to do this now?'
      ),
      {
        modal: modal,
      },
      { title: i18n('ui', 'Yes') },
      { title: i18n('ui', 'No'), isCloseAffordance: true }
    );
    if (buildRes?.title === i18n('ui', 'Yes')) {
      await this.externalApi.getBuildTestAPI().syncCode(workspace, undefined);
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
