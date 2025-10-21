'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { IJsonDependency, VendorLibrariesBase } from './shared/vendorlibrariesbase';
import { deleteFileAsync, readdirAsync } from './utilities';

export class VendorLibraries extends VendorLibrariesBase {
  private disposables: vscode.Disposable[] = [];
  private externalApi: IExternalAPI;
  private lastBuildTime = 1;

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
    return anySucceeded;
  }

  public getWpVendorFolder(workspace: vscode.WorkspaceFolder): string {
    return path.join(workspace.uri.fsPath, 'vendordeps');
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
