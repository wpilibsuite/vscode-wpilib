'use strict';

import * as json from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { logger } from './logger';
import { extensionContext, readFileAsync } from './utilities';
import { VendorLibraries } from './vendorlibraries';
import { WPILibUpdates } from './wpilibupdates';

export interface IVendorLibraryPair {
  name: string;
  version: string;
}

export interface IProjectInfo {
  wpilibProjectVersion: string;
  wpilibExtensionVersion: string;
  vendorLibraries: IVendorLibraryPair[];
}

export class ProjectInfoGatherer {
  private vendorLibraries: VendorLibraries;
  private wpilibUpdates: WPILibUpdates;
  private externalApi: IExternalAPI;
  private disposables: vscode.Disposable[] = [];

  public constructor(vendorLibraries: VendorLibraries, wpilibUpdates: WPILibUpdates, externalApi: IExternalAPI) {
    this.vendorLibraries = vendorLibraries;
    this.wpilibUpdates = wpilibUpdates;
    this.externalApi = externalApi;

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.getProjectInformation', async () => {
      await this.displayProjectInfo();
    }));
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public async displayProjectInfo(): Promise<void> {
    const wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      logger.warn('no workspace');
      return;
    }
    const projectInfo = await this.getProjectInfo(wp);
    let infoString = `WPILib Information:
Project Version: ${projectInfo.wpilibProjectVersion}
WPILib Extension Version: ${projectInfo.wpilibExtensionVersion}
Vendor Libraries:
`;

    for (const lib of projectInfo.vendorLibraries) {
      infoString += `    ${lib.name} (${lib.version})
`;
    }

    vscode.window.showInformationMessage(infoString, {
      modal: true,
    });
  }

  private async getProjectInfo(workspace: vscode.WorkspaceFolder): Promise<IProjectInfo> {
    const vendorLibs = await this.vendorLibraries.getCurrentlyInstalledLibraries(workspace);

    let currentGradleVersion = await this.wpilibUpdates.getGradleRIOVersion(workspace);

    if (currentGradleVersion === undefined) {
      currentGradleVersion = 'unknown';
    }

    const extensionPackageJson = path.join(extensionContext.extensionPath, 'package.json');
    const packageJson = await readFileAsync(extensionPackageJson, 'utf8');
    // tslint:disable-next-line: no-unsafe-any
    const currentVsCodeVersion: string = json.parse(packageJson).version;

    const projectInfo: IProjectInfo = {
      vendorLibraries: [],
      wpilibExtensionVersion: currentVsCodeVersion,
      wpilibProjectVersion: currentGradleVersion,
    };

    for (const lib of vendorLibs) {
      projectInfo.vendorLibraries.push({
        name: lib.name,
        version: lib.version,
      });
    }

    return projectInfo;
  }
}
