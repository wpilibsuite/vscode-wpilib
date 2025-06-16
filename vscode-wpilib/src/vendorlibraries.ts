'use strict';

import path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { logger } from './logger';
import { deleteFileAsync, readdirAsync } from './utilities';
import { localize as i18n } from './utils/l10n/locale';
import { IJsonDependency, VendorLibrariesBase } from './utils/project/vendorlibrariesbase';

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
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
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

  public async uninstallVendorLibraries(
    toRemove: IJsonDependency[] | undefined,
    workspace: vscode.WorkspaceFolder
  ): Promise<boolean> {
    let anySucceeded = false;
    if (toRemove !== undefined && toRemove.length > 0) {
      const url = this.getWpVendorFolder(workspace);
      const files = await readdirAsync(url);
      for (const file of files) {
        const fullPath = path.join(url, file);
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

  public getWpVendorFolder(workspace: vscode.WorkspaceFolder): string {
    return path.join(workspace.uri.fsPath, 'vendordeps');
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
