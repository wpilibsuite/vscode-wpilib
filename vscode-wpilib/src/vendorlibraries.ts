'use strict';

import * as vscode from 'vscode';
import { logger } from './logger';
import { IExternalAPI } from 'vscode-wpilibapi';
import { localize as i18n } from './utils/i18n/locale';
import { IJsonDependency, VendorLibrariesBase } from './utils/project/vendorlibrariesbase';
import { deleteFileAsync, readdirAsync } from './utilities';
import { isNewerVersion } from './versions';
import * as pathUtils from './utils/project/pathUtils';

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
  private installedDepsCache: Map<string, IJsonDependency[]> = new Map();
  private homeDirDepsCache: IJsonDependency[] | undefined = undefined;
  private homeDirDepsCacheLastUpdated: number = 0;
  private homeDirDepsFetchPromise: Promise<IJsonDependency[]> | null = null;
  private refreshInProgress: boolean = false; // Prevent concurrent refreshes
  private installedDepsFetchPromises: Map<string, Promise<IJsonDependency[]>> = new Map(); // Track in-progress fetches per workspace

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

    const prefs = this.externalApi.getPreferencesAPI().getPreferences(workspace);
    const projectYear = prefs.getProjectYear();
    const isWPILib = prefs.getIsWPILibProject && prefs.getIsWPILibProject();
    if (projectYear === 'none' || !isWPILib) {
      vscode.window.showErrorMessage(
        'This is not a WPILib project. Vendor dependency management is only available for WPILib projects. To use vendor dependencies, open a WPILib project or create a new one from the WPILib extension.'
      );
      return;
    }

    // Pre-load dependencies to warm the cache.
    // These run in the background and do not delay the QuickPick.
    // Errors are logged and do not prevent the UI from showing.
    this.getInstalledDependencies(workspace).catch((err) => {
      logger.warn('Failed to preload installed dependencies for vendor libraries', { error: err });
    });
    this.getCachedHomeDirDeps(false).catch((err) => {
      // false: do not force refresh from disk if cache is valid
      logger.warn('Failed to preload home directory dependencies for vendor libraries', {
        error: err,
      });
    });

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

  public async getCachedHomeDirDeps(forceRefresh: boolean = false): Promise<IJsonDependency[]> {
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    if (this.refreshInProgress) {
      // If a refresh is already in progress, wait for it to finish
      if (this.homeDirDepsFetchPromise) {
        return this.homeDirDepsFetchPromise;
      }
    }

    // If not forcing refresh and cache is valid, return it
    if (
      !forceRefresh &&
      this.homeDirDepsCache &&
      now - this.homeDirDepsCacheLastUpdated < CACHE_DURATION_MS
    ) {
      logger.log('Returning home dir deps from memory cache.');
      return this.homeDirDepsCache;
    }

    // If a fetch is already in progress, await its completion
    if (this.homeDirDepsFetchPromise) {
      logger.log('Home dir deps fetch already in progress, awaiting existing fetch.');
      return this.homeDirDepsFetchPromise;
    }

    // Otherwise, initiate a new fetch
    logger.log(`Initiating fetch for home dir deps. Force refresh: ${forceRefresh}`);
    this.refreshInProgress = true;
    this.homeDirDepsFetchPromise = (async () => {
      try {
        // getHomeDirDeps is inherited from VendorLibrariesBase
        const deps = await super.getHomeDirDeps();
        this.homeDirDepsCache = deps;
        this.homeDirDepsCacheLastUpdated = Date.now();
        logger.log('Home dir deps cache updated from disk/source.');
        return deps;
      } catch (error) {
        logger.error('Failed to refresh home dir deps', { error });
        // On error, return the last known good cache if available, or an empty array.
        // This prevents callers from failing entirely if a refresh fails; they get potentially stale data.
        return this.homeDirDepsCache ?? [];
      } finally {
        this.homeDirDepsFetchPromise = null; // Clear the promise once the fetch is complete (success or failure)
        this.refreshInProgress = false;
      }
    })();
    return this.homeDirDepsFetchPromise;
  }

  private async manageCurrentLibraries(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);

    if (installedDeps.length !== 0) {
      const arr = installedDeps.map((jdep) => {
        return new LibraryQuickPick(jdep);
      });
      const toRemove = await vscode.window.showQuickPick(arr, {
        canPickMany: true,
        placeHolder: i18n('message', 'Check to uninstall libraries'),
      });

      if (toRemove !== undefined && toRemove.length > 0) {
        const depsToRemove = toRemove.map((qp) => qp.dep);
        await this.uninstallVendorLibraries(depsToRemove, workspace);
      }
    } else {
      vscode.window.showInformationMessage(i18n('message', 'No dependencies installed'));
    }
  }

  public async uninstallVendorLibraries(
    toRemove: IJsonDependency[] | undefined,
    workspace: vscode.WorkspaceFolder
  ): Promise<boolean> {
    let anySucceeded = false;
    if (toRemove !== undefined && toRemove.length > 0) {
      const url = this.getWpVendorFolder(workspace);
      const files = await readdirAsync(url);
      for (const file of files) {
        const fullPath = pathUtils.joinPath(url, file);
        const result = await this.readFile(fullPath);
        if (result !== undefined) {
          for (const ti of toRemove) {
            if (result.uuid === ti.uuid) {
              try {
                await deleteFileAsync(fullPath);
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

    if (anySucceeded) {
      this.installedDepsCache.delete(workspace.uri.fsPath);
      fireVendorDepsChanged(workspace);
      this.offerBuild(workspace);
    }
    return anySucceeded;
  }

  private async offlineUpdates(workspace: vscode.WorkspaceFolder): Promise<void> {
    const installedDeps = await this.getInstalledDependencies(workspace);

    if (installedDeps.length !== 0) {
      const availableDeps = await this.getCachedHomeDirDeps();
      const updatableDeps: LibraryQuickPick[] = [];
      for (const ad of availableDeps) {
        for (const id of installedDeps) {
          if (id.uuid === ad.uuid) {
            // Maybe update available
            if (isNewerVersion(ad.version, id.version)) {
              updatableDeps.push(new LibraryQuickPick(ad, id.version));
            }
            break;
          }
        }
      }
      if (updatableDeps.length !== 0) {
        const toUpdate = await vscode.window.showQuickPick(updatableDeps, {
          canPickMany: true,
          placeHolder: i18n('message', 'Check to update libraries'),
        });

        if (toUpdate !== undefined && toUpdate.length > 0) {
          let anySucceeded = false;
          for (const ti of toUpdate) {
            const success = await this.installDependency(
              ti.dep,
              this.getWpVendorFolder(workspace),
              true
            );
            if (success) {
              anySucceeded = true;
            } else {
              vscode.window.showErrorMessage(i18n('message', 'Failed to update {0}', ti.dep.name));
            }
          }
          if (anySucceeded) {
            this.installedDepsCache.delete(workspace.uri.fsPath);
            fireVendorDepsChanged(workspace);
            this.offerBuild(workspace);
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
      const updatable: LibraryQuickPick[] = [];
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

        if (toUpdate !== undefined && toUpdate.length > 0) {
          let anySucceeded = false;
          for (const ti of toUpdate) {
            const success = await this.installDependency(
              ti.dep,
              this.getWpVendorFolder(workspace),
              true
            );
            if (success) {
              anySucceeded = true;
            } else {
              vscode.window.showErrorMessage(i18n('message', 'Failed to update {0}', ti.dep.name));
            }
          }
          if (anySucceeded) {
            this.installedDepsCache.delete(workspace.uri.fsPath);
            fireVendorDepsChanged(workspace);
            this.offerBuild(workspace);
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
    // --- WPILib project check ---
    const prefs = this.externalApi.getPreferencesAPI().getPreferences(workspace);
    const projectYear = prefs.getProjectYear();
    const isWPILib = prefs.getIsWPILibProject && prefs.getIsWPILibProject();
    if (projectYear === 'none' || !isWPILib) {
      vscode.window.showErrorMessage(
        'This is not a WPILib project. Vendor dependency management is only available for WPILib projects. To use vendor dependencies, open a WPILib project or create a new one from the WPILib extension.'
      );
      return;
    }
    // --- end WPILib project check ---
    const installedDeps = await this.getInstalledDependencies(workspace);

    const availableDeps = await this.getCachedHomeDirDeps();
    const installableDeps: LibraryQuickPick[] = [];
    for (const ad of availableDeps) {
      let foundDep = false;
      for (const id of installedDeps) {
        if (id.uuid === ad.uuid) {
          foundDep = true;
          break;
        }
      }
      if (!foundDep) {
        installableDeps.push(new LibraryQuickPick(ad));
      }
    }
    if (installableDeps.length !== 0) {
      const toInstall = await vscode.window.showQuickPick(installableDeps, {
        canPickMany: true,
        placeHolder: i18n('message', 'Check to install libraries'),
      });

      if (toInstall !== undefined && toInstall.length > 0) {
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
          this.installedDepsCache.delete(workspace.uri.fsPath);
          fireVendorDepsChanged(workspace);
          this.offerBuild(workspace);
        }
      }
    } else {
      vscode.window.showInformationMessage(i18n('message', 'No new dependencies available'));
    }
  }

  private async onlineNew(workspace: vscode.WorkspaceFolder): Promise<void> {
    // --- WPILib project check ---
    const prefs = this.externalApi.getPreferencesAPI().getPreferences(workspace);
    const projectYear = prefs.getProjectYear();
    const isWPILib = prefs.getIsWPILibProject && prefs.getIsWPILibProject();
    if (projectYear === 'none' || !isWPILib) {
      vscode.window.showErrorMessage(
        'This is not a WPILib project. Vendor dependency management is only available for WPILib projects. To use vendor dependencies, open a WPILib project or create a new one from the WPILib extension.'
      );
      return;
    }
    // --- end WPILib project check ---
    const result = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: i18n('message', 'Enter a vendor file URL (get from vendor)'),
      prompt: i18n('message', 'Enter a vendor file URL (get from vendor)'),
    });

    if (result) {
      let file: IJsonDependency;
      try {
        file = await this.loadFileFromUrl(result);
      } catch (err) {
        // loadFileFromUrl already logs, just show message to user
        vscode.window.showErrorMessage(i18n('message', 'Failed to load vendor file from URL.'));
        return;
      }
      // Load existing libraries
      const existing = await this.getInstalledDependencies(workspace);

      for (const dep of existing) {
        if (dep.uuid === file.uuid) {
          if (dep.version === file.version) {
            vscode.window.showInformationMessage(
              i18n('message', '{0} version {1} is already installed.', file.name, file.version)
            );
            return;
          } else {
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
              return;
            }
          }
        }
      }

      const success = await this.installDependency(file, this.getWpVendorFolder(workspace), true);
      if (success) {
        this.installedDepsCache.delete(workspace.uri.fsPath);
        fireVendorDepsChanged(workspace);
        this.offerBuild(workspace, true);
      } else {
        vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', file.name));
      }
    }
  }

  public getWpVendorFolder(workspace: vscode.WorkspaceFolder): string {
    return this.getVendorFolder(workspace.uri.fsPath);
  }

  private async getInstalledDependencies(
    workspace: vscode.WorkspaceFolder
  ): Promise<IJsonDependency[]> {
    const cacheKey = workspace.uri.fsPath;
    // If a fetch is already in progress for this workspace, return the same promise
    if (this.installedDepsFetchPromises.has(cacheKey)) {
      return this.installedDepsFetchPromises.get(cacheKey)!;
    }
    // If we have a cached value, return it
    if (this.installedDepsCache.has(cacheKey)) {
      const cachedDeps = this.installedDepsCache.get(cacheKey);
      if (cachedDeps !== undefined) {
        return cachedDeps;
      }
    }
    // Start a new fetch and track it
    const fetchPromise = (async () => {
      try {
        const deps = await this.getDependencies(this.getWpVendorFolder(workspace));
        // Deduplicate by uuid
        const seen = new Set<string>();
        const deduped = deps.filter((dep) => {
          if (seen.has(dep.uuid)) return false;
          seen.add(dep.uuid);
          return true;
        });
        this.installedDepsCache.set(cacheKey, deduped);
        return deduped;
      } finally {
        this.installedDepsFetchPromises.delete(cacheKey);
      }
    })();
    this.installedDepsFetchPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
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

/**
 * Fires an event indicating the vendor dependencies have changed.
 * Listeners (e.g. build or UI update routines) should subscribe to
 * the onVendorDepsChanged event.
 *
 * @param workspace The workspace folder where the change occurred.
 */
export function fireVendorDepsChanged(workspace: vscode.WorkspaceFolder): void {
  eventListener.fire(workspace);
}
