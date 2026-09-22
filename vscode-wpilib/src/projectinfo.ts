'use strict';

import { readFile } from 'fs/promises';
import * as json from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { findJdkPath, getJavaVersion } from './jdkdetector';
import { logger } from './logger';
import { extensionContext } from './utilities';
import { VendorLibraries } from './vendorlibraries';
import { getGradleRIOVersion } from './wpilibupdates';

export interface IVendorLibraryPair {
  name: string;
  version: string;
}

export interface IVscodeExtension {
  id: string;
  version: string;
}

export interface IProjectInfo {
  wpilibProjectVersion: string;
  wpilibExtensionVersion: string;
  vendorLibraries: IVendorLibraryPair[];
  vscodeExtensions: IVscodeExtension[];
  wpilibProjectYear: string;
  wpilibLanguage: string;
}

const wpilibExtensionIds = {
  cpp: 'ms-vscode.cpptools',
  java: 'redhat.java',
  javaDebug: 'vscjava.vscode-java-debug',
  javaDependencies: 'vscjava.vscode-java-dependency',
  wpilib: 'wpilibsuite.vscode-wpilib',
};

const excludedExtensionIds: ReadonlySet<string> = new Set(Object.values(wpilibExtensionIds));

function extensionVersion(id: string): string {
  const extension = vscode.extensions.getExtension(id);
  if (!extension) {
    return 'Not Installed';
  }
  return extension.packageJSON.version;
}

export class ProjectInfoGatherer {
  private vendorLibraries: VendorLibraries;
  private externalApi: IExternalAPI;
  private disposables: vscode.Disposable[] = [];
  private statusBar: vscode.StatusBarItem;

  public constructor(vendorLibraries: VendorLibraries, externalApi: IExternalAPI) {
    this.vendorLibraries = vendorLibraries;
    this.externalApi = externalApi;

    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    this.statusBar.text = 'WPILib';
    this.statusBar.tooltip = 'Open WPILib Project Information';
    this.statusBar.command = 'wpilibcore.getProjectInformation';
    this.disposables.push(this.statusBar);

    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces) {
      for (const wp of workspaces) {
        const prefs = this.externalApi.getPreferencesAPI().getPreferences(wp);
        if (prefs.getIsWPILibProject()) {
          this.statusBar.show();
          break;
        }
      }
    }

    this.disposables.push(
      vscode.commands.registerCommand('wpilibcore.getProjectInformation', async () => {
        await this.displayProjectInfo();
      })
    );
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public async displayProjectInfo(): Promise<void> {
    const wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (!wp) {
      logger.warn('no workspace');
      return;
    }
    const projectInfo = await this.getProjectInfo(wp);
    const jdkLoc = await findJdkPath(this.externalApi);
    const jdkVer = !jdkLoc ? 'unknown' : await getJavaVersion(jdkLoc);
    const debugExt = extensionVersion(wpilibExtensionIds.javaDebug);
    const depViewer = extensionVersion(wpilibExtensionIds.javaDependencies);
    const javaExt = extensionVersion(wpilibExtensionIds.java);
    const cppExt = extensionVersion(wpilibExtensionIds.cpp);
    let vendorLibs = '\n';
    let extensionList = '\n';
    for (const lib of projectInfo.vendorLibraries) {
      vendorLibs += `    ${lib.name} (${lib.version})\n`;
    }
    for (const extension of projectInfo.vscodeExtensions) {
      if (excludedExtensionIds.has(extension.id) || extension.id.startsWith('vscode.')) {
        continue;
      }
      extensionList += `    ${extension.id} (${extension.version})\n`;
    }

    const infoString = `WPILib Information:
Project Version: ${projectInfo.wpilibProjectVersion}
VS Code Version: ${vscode.version}
WPILib Extension Version: ${projectInfo.wpilibExtensionVersion}
Project Year: ${projectInfo.wpilibProjectYear}
Language: ${projectInfo.wpilibLanguage}
C++ Extension Version: ${cppExt}
Java Extension Version: ${javaExt}
Java Debug Extension Version: ${debugExt}
Java Dependencies Extension Version: ${depViewer}
Java Version: ${jdkVer}
Java Location: ${jdkLoc}
Vendor Libraries: ${vendorLibs}
VS Code Extensions: ${extensionList}
`;

    vscode.window
      .showInformationMessage(
        infoString,
        {
          modal: true,
        },
        'Copy'
      )
      .then((action) => {
        if (action === 'Copy') {
          vscode.env.clipboard.writeText(infoString);
        }
      });
  }

  public async getViewInfo(): Promise<IProjectInfo | undefined> {
    const wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (!wp) {
      return wp;
    }
    return this.getProjectInfo(wp);
  }

  private async getProjectInfo(workspace: vscode.WorkspaceFolder): Promise<IProjectInfo> {
    const vendorLibs = await this.vendorLibraries.getCurrentlyInstalledLibraries(workspace);
    const prefs = this.externalApi.getPreferencesAPI().getPreferences(workspace);

    let currentGradleVersion = await getGradleRIOVersion(workspace);

    if (!currentGradleVersion) {
      currentGradleVersion = 'unknown';
    }

    const extensionPackageJson = path.join(extensionContext.extensionPath, 'package.json');
    const packageJson = await readFile(extensionPackageJson, 'utf8');
    const currentVsCodeVersion: string = json.parse(packageJson).version as string;
    const currentProjectYear: string = prefs.getProjectYear();
    const currentLanguage: string = prefs.getCurrentLanguage();
    const vscodeExtensions = vscode.extensions.all
      .map((extension) => ({
        id: extension.id,
        version: extension.packageJSON.version as string,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const projectInfo: IProjectInfo = {
      vendorLibraries: [],
      vscodeExtensions,
      wpilibExtensionVersion: currentVsCodeVersion,
      wpilibProjectVersion: currentGradleVersion,
      wpilibProjectYear: currentProjectYear,
      wpilibLanguage: currentLanguage,
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
