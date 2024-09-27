'use strict';

import * as json from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from 'vscode-wpilibapi';
import { logger } from './logger';
import { extensionContext, readFileAsync } from './utilities';
import { VendorLibraries } from './vendorlibraries';
import { WPILibUpdates } from './wpilibupdates';
import { findJdkPath, getJavaVersion } from './jdkdetector';

export interface IVendorLibraryPair {
  name: string;
  version: string;
}

export interface IProjectInfo {
  wpilibProjectVersion: string;
  wpilibExtensionVersion: string;
  javaDebugExtensionVersion: string;
  javaExtensionVersion: string;
  javaDependenciesExtensionVersion: string;
  cppExtensionVersion: string;
  vendorLibraries: IVendorLibraryPair[];
}

async function extensionVersion(extension: vscode.Extension<unknown> | undefined): Promise<string> {
  if (extension === undefined) {
    return 'Not Installed';
  }
  return extension.packageJSON.version;
}

export class ProjectInfoGatherer {
  private vendorLibraries: VendorLibraries;
  private wpilibUpdates: WPILibUpdates;
  private externalApi: IExternalAPI;
  private disposables: vscode.Disposable[] = [];
  private statusBar: vscode.StatusBarItem;

  public constructor(vendorLibraries: VendorLibraries, wpilibUpdates: WPILibUpdates, externalApi: IExternalAPI) {
    this.vendorLibraries = vendorLibraries;
    this.wpilibUpdates = wpilibUpdates;
    this.externalApi = externalApi;

    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    this.statusBar.text = 'WPILib';
    this.statusBar.tooltip = 'Open WPILib Project Information';
    this.statusBar.command = 'wpilibcore.getProjectInformation';
    this.disposables.push(this.statusBar);

    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces !== undefined) {
      for (const wp of workspaces) {
        const prefs = this.externalApi.getPreferencesAPI().getPreferences(wp);
        if (prefs.getIsWPILibProject()) {
          this.statusBar.show();
          break;
        }
      }
    }

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
    const jdkLoc = await findJdkPath(this.externalApi);
    const jdkVer = (jdkLoc === undefined) ? 'unknown' : await getJavaVersion(jdkLoc);
    let infoString = `WPILib Information:
Project Version: ${projectInfo.wpilibProjectVersion}
VS Code Version: ${vscode.version}
WPILib Extension Version: ${projectInfo.wpilibExtensionVersion}
C++ Extension Version: ${projectInfo.cppExtensionVersion}
Java Extension Version: ${projectInfo.javaExtensionVersion}
Java Debug Extension Version: ${projectInfo.javaDebugExtensionVersion}
Java Dependencies Extension Version ${projectInfo.javaDependenciesExtensionVersion}
Java Version: ${jdkVer}
Java Location: ${jdkLoc}
Vendor Libraries:
`;

    for (const lib of projectInfo.vendorLibraries) {
      infoString += `    ${lib.name} (${lib.version})
`;
    }

    vscode.window.showInformationMessage(infoString, {
      modal: true,
    }, 'Copy').then(action => {
      if (action === 'Copy') {
        vscode.env.clipboard.writeText(infoString);
      }
    });
  }

  public async getViewInfo(): Promise<IProjectInfo | undefined> {
    const wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (wp === undefined) {
      return wp;
    }
    return this.getProjectInfo(wp);
  }

  private async getProjectInfo(workspace: vscode.WorkspaceFolder): Promise<IProjectInfo> {
    const vendorLibs = await this.vendorLibraries.getCurrentlyInstalledLibraries(workspace);

    let currentGradleVersion = await this.wpilibUpdates.getGradleRIOVersion(workspace);

    if (currentGradleVersion === undefined) {
      currentGradleVersion = 'unknown';
    }

    const debugExt =  await extensionVersion(vscode.extensions.getExtension('vscjava.vscode-java-debug'));
    const depViewer = await extensionVersion(vscode.extensions.getExtension('vscjava.vscode-java-dependency'));
    const javaExt = await extensionVersion(vscode.extensions.getExtension('redhat.java'));
    const cpp = await extensionVersion(vscode.extensions.getExtension('ms-vscode.cpptools'));

    const extensionPackageJson = path.join(extensionContext.extensionPath, 'package.json');
    const packageJson = await readFileAsync(extensionPackageJson, 'utf8');
    const currentVsCodeVersion: string = json.parse(packageJson).version;

    const projectInfo: IProjectInfo = {
      cppExtensionVersion: cpp,
      javaDebugExtensionVersion: debugExt,
      javaDependenciesExtensionVersion: depViewer,
      javaExtensionVersion: javaExt,
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
