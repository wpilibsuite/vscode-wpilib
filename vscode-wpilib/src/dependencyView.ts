import * as fs from 'fs';
import fetch from 'node-fetch';
import type { RequestInit } from 'node-fetch';
import * as path from 'path';
import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { IProjectInfo, ProjectInfoGatherer } from './projectinfo';
import { IJsonDependency } from './shared/vendorlibrariesbase';
import { VendorLibraries } from './vendorlibraries';
import { isNewerVersion } from './versions';
// @ts-ignore
export interface IJsonList {
  path: string;
  name: string;
  version: string;
  uuid: string;
  description: string;
  website: string;
  instructions?: string;
}

export interface IDepInstalled {
  name: string;
  currentVersion: string;
  versionInfo: { version: string; buttonText: string }[];
}

export interface IJSMessage {
  type: string;
  version: string;
  index: string;
  url?: string;
}

type NodeFetchOptions = RequestInit & { timeout?: number };

export class DependencyViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'wpilib.dependencyView';
  private projectInfo: ProjectInfoGatherer;
  private vendorLibraries: VendorLibraries;
  private viewInfo: IProjectInfo | undefined;
  private disposables: vscode.Disposable[] = [];
  private installedDeps: IJsonDependency[] = []; // The actual dep information that is installed
  private availableDeps: IJsonList[] = []; // All available deps
  private availableDepsList: IJsonList[] = []; // Only the deps that are not installed and the latest version
  private onlineDeps: IJsonList[] = []; // The deps from the <year>.json file in the vendor-json-repo
  private installedList: IDepInstalled[] = []; // To display deps in the installed list
  private homeDeps: IJsonDependency[] = []; // These are the offline deps in the home directory
  private externalApi: IExternalAPI;
  private vendordepMarketplaceURL = `https://frcmaven.wpi.edu/artifactory/vendordeps/vendordep-marketplace/`;
  private wp: vscode.WorkspaceFolder | undefined;
  private changed = 0;
  private refreshInProgress = false;
  private showingInstructions = false;
  private viewReady = false;
  private pendingDependenciesUpdate:
    | {
        type: 'updateDependencies';
        installed: IDepInstalled[];
        available: IJsonList[];
      }
    | undefined;

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    projectInfo: ProjectInfoGatherer,
    vendorLibraries: VendorLibraries,
    externalAPI: IExternalAPI
  ) {
    this.projectInfo = projectInfo;
    this.vendorLibraries = vendorLibraries;
    this.externalApi = externalAPI;
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    this.viewReady = false;
    this.pendingDependenciesUpdate = undefined;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        this._extensionUri,
        vscode.Uri.joinPath(this._extensionUri, 'resources', 'media'),
        vscode.Uri.joinPath(this._extensionUri, 'resources', 'dist'),
      ],
    };

    this.wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (this.wp === undefined) {
      logger.warn('no workspace');
      return;
    }

    const prefs = this.externalApi.getPreferencesAPI().getPreferences(this.wp);
    if (prefs.getProjectYear() === 'none' || !prefs.getIsWPILibProject()) {
      webviewView.webview.html = `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WPILib Vendor Dependencies</title>
            <link rel="stylesheet" href="${webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'media', 'main.css'))}">
            <link rel="stylesheet" href="${webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'media', 'icons.css'))}" id="vscode-codicon-stylesheet">
          </head>
          <body>
            <div class="error-content" style="max-width: 500px; margin: 48px auto; text-align: center;">
              <span class="codicon codicon-warning" style="font-size: 32px; display: block; margin-bottom: 16px;"></span>
              <b>This is not a WPILib project.</b><br/>
              Vendor dependency management is only available for WPILib projects.<br/>
              <br/>
              To use vendor dependencies, open a WPILib project or create a new one from the WPILib extension.
            </div>
          </body>
        </html>
      `;
      return;
    }

    if (this.projectInfo) {
      this.viewInfo = await this.projectInfo.getViewInfo();
    }

    void this._refresh(this.wp);
    webviewView.onDidChangeVisibility(() => {
      if (this.wp) {
        // If the webview becomes visible refresh it, invisible then check for changes
        if (webviewView.visible) {
          void this._refresh(this.wp);
        } else {
          if (this.showingInstructions) {
            this.showingInstructions = false;
          } else if (this.changed > this.vendorLibraries.getLastBuild()) {
            this.externalApi.getBuildTestAPI().buildCode(this.wp, undefined);
            this.changed = 0;
          }
        }
      }
    });

    this.viewInfo?.vendorLibraries.forEach((item) =>
      console.log(item.name.concat(' / ', item.version))
    );

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    const disposeListener = webviewView.onDidDispose(() => {
      this.viewReady = false;
      this.pendingDependenciesUpdate = undefined;
    });
    this.disposables.push(disposeListener);

    webviewView.webview.onDidReceiveMessage((data) => {
      if (this.isJSMessage(data)) {
        switch (data.type) {
          case 'loaded': {
            this.viewReady = true;
            if (this.pendingDependenciesUpdate) {
              void this._view?.webview.postMessage(this.pendingDependenciesUpdate);
              this.pendingDependenciesUpdate = undefined;
            }
            break;
          }
          case 'install': {
            void this.install(data.index);
            break;
          }
          case 'uninstall': {
            void this.uninstall(data.index);
            break;
          }
          case 'update': {
            void this.update(data.version, data.index);
            break;
          }
          case 'updateall': {
            void this.updateall();
            break;
          }
          case 'installFromUrl': {
            void this.installFromUrl(data.url);
            break;
          }
          case 'blur': {
            if (this.wp) {
              if (this.showingInstructions) {
                this.showingInstructions = false;
              } else if (this.changed > this.vendorLibraries.getLastBuild()) {
                this.externalApi.getBuildTestAPI().buildCode(this.wp, undefined);
                this.changed = 0;
              }
            }
            break;
          }
          default: {
            break;
          }
        }
      }
    });
  }

  private isJSMessage(object: unknown): object is IJSMessage {
    const maybeJSMessage = object as IJSMessage;
    return maybeJSMessage && typeof maybeJSMessage.type === 'string';
  }

  private async update(version: string, indexString: string) {
    const index = parseInt(indexString, 10);
    // Make sure we have a workspace
    if (this.wp) {
      // If the version matches the current version then we want to update to latest
      const versionToInstall =
        version === this.installedList[index].currentVersion
          ? // Get the version of the first element of the array AKA the latest version
            this.installedList[index].versionInfo[0].version
          : // It isn't the current version so user must have specified something else
            version;

      // Match both the name and the version
      const avail = this.availableDeps.find(
        (available) =>
          versionToInstall === available.version &&
          this.installedList[index].name === available.name
      );
      await this.getURLInstallDep(avail);
      await this._refresh(this.wp);
    }
  }

  private async updateall() {
    if (this.wp) {
      for (const installed of this.installedList) {
        if (installed.versionInfo[0].version !== installed.currentVersion && this.wp) {
          // Match both the name and the version
          const avail = this.availableDeps.find(
            (available) =>
              installed.versionInfo[0].version === available.version &&
              installed.name === available.name
          );
          await this.getURLInstallDep(avail);
        }
      }

      await this._refresh(this.wp);
    }
  }

  private async install(index: string) {
    const avail = this.availableDepsList[parseInt(index, 10)];
    if (avail && this.wp) {
      await this.getURLInstallDep(avail);
      await this._refresh(this.wp);
    }
  }

  private async uninstall(index: string) {
    this.sortInstalledDeps();
    const uninstall = [this.installedDeps[parseInt(index, 10)]];
    if (this.wp) {
      const success = await this.vendorLibraries.uninstallVendorLibraries(uninstall, this.wp);
      if (success) {
        this.changed = Date.now();
      }
      await this._refresh(this.wp);
    }
  }

  private async getURLInstallDep(avail: IJsonList | undefined) {
    if (avail && this.wp) {
      const dep = await this.listToDependency(avail);

      if (dep) {
        let conflictdep = undefined;
        if (dep.conflictsWith) {
          // Check to see if it conflicts with currently installed deps
          for (const conflict of dep.conflictsWith) {
            if (this.installedDeps.find((installedDep) => installedDep.uuid === conflict.uuid)) {
              conflictdep = conflict;
              break;
            }
          }
        }

        // If no conflict is found install otherwise show dialog
        if (!conflictdep) {
          const success = await this.vendorLibraries.installDependency(
            dep,
            this.vendorLibraries.getWpVendorFolder(this.wp),
            true
          );

          if (success) {
            if (avail.instructions) {
              this.showingInstructions = true;
              try {
                new URL(avail.instructions);
                await vscode.commands.executeCommand('simpleBrowser.show', avail.instructions);
              } catch (e) {
                vscode.window.showErrorMessage(
                  `Could not display website! Invalid URL: "${avail.instructions}"`
                );
              }
            }
            this.changed = Date.now();

            if (dep.requires) {
              let reqDep = undefined;
              // Check to see if there are required deps and install those too
              for (const required of dep.requires) {
                reqDep = this.availableDepsList.find(
                  (requiredDep) => requiredDep.uuid === required.uuid
                );
                const newDep = await this.listToDependency(reqDep);
                if (reqDep && newDep) {
                  await this.vendorLibraries.installDependency(
                    newDep,
                    this.vendorLibraries.getWpVendorFolder(this.wp),
                    true
                  );
                  // Do not show install instructions for required deps only selected.
                }
              }
            }
          }
        } else {
          vscode.window.showErrorMessage(i18n('message', '{0}', conflictdep.errorMessage), {
            modal: true,
          });
        }
      }
    }
  }

  private async listToDependency(avail: IJsonList | undefined) {
    let dependency = undefined;
    if (avail && this.wp) {
      // Check to see if it is already a URL
      let url = avail.path;
      if (url.substring(0, 4) !== 'http') {
        url = this.vendordepMarketplaceURL + url;
      }
      try {
        dependency = await this.vendorLibraries.getJsonDepURL(url);
      } catch {
        dependency = this.homeDeps.find(
          (homdep) => homdep.uuid === avail.uuid && homdep.version === avail.version
        );
      }
    }
    return dependency;
  }

  /**
   * Install a vendor dependency from a URL
   * @param url The URL to install the dependency from
   */
  private async installFromUrl(url: string | undefined) {
    if (!url || !this.wp) {
      logger.warn('installFromUrl called with invalid parameters', {
        url,
        hasWorkspace: !!this.wp,
      });
      return;
    }

    // Validate URL format
    if (!url.trim()) {
      vscode.window.showErrorMessage(i18n('message', 'Please enter a valid URL'));
      return;
    }

    try {
      // Attempt to fetch and parse the dependency from the URL
      const file = await this.vendorLibraries.getJsonDepURL(url.trim());

      if (!file) {
        vscode.window.showErrorMessage(i18n('message', 'Failed to load vendor file from URL.'));
        return;
      }

      // Load existing libraries to check for conflicts and duplicates
      const existing = await this.vendorLibraries.getCurrentlyInstalledLibraries(this.wp);

      // Check if already installed
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

      // Check for conflicts with currently installed dependencies
      let conflictDep = undefined;
      if (file.conflictsWith) {
        for (const conflict of file.conflictsWith) {
          const existingDep = existing.find((installedDep) => installedDep.uuid === conflict.uuid);
          if (existingDep) {
            conflictDep = conflict;
            break;
          }
        }
      }

      // If no conflict is found, proceed with installation
      if (!conflictDep) {
        const success = await this.vendorLibraries.installDependency(
          file,
          this.vendorLibraries.getWpVendorFolder(this.wp),
          true
        );

        if (success) {
          this.changed = Date.now();

          // Install required dependencies if any
          if (file.requires) {
            for (const required of file.requires) {
              try {
                const requiredDep = await this.vendorLibraries.getJsonDepURL(required.onlineUrl);
                await this.vendorLibraries.installDependency(
                  requiredDep,
                  this.vendorLibraries.getWpVendorFolder(this.wp),
                  true
                );
              } catch (err) {
                vscode.window.showWarningMessage(
                  i18n(
                    'message',
                    'Failed to install required dependency: {0}',
                    required.errorMessage
                  )
                );
              }
            }
          }

          // Refresh the view to show the newly installed dependency
          await this._refresh(this.wp);
        } else {
          vscode.window.showErrorMessage(i18n('message', 'Failed to install {0}', file.name));
        }
      } else {
        // Show conflict error
        vscode.window.showErrorMessage(i18n('message', '{0}', conflictDep.errorMessage), {
          modal: true,
        });
      }
    } catch (err) {
      // Error handling matches the command palette version
      vscode.window.showErrorMessage(i18n('message', 'Failed to load vendor file from URL.'));
    }
  }

  public addDependency() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'addDependency' });
    }
  }

  public updateDependencies() {
    const message = {
      type: 'updateDependencies' as const,
      installed: this.installedList,
      available: this.availableDepsList,
    };

    if (!this.viewReady) {
      this.pendingDependenciesUpdate = message;
      return;
    }

    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async _refresh(workspace: vscode.WorkspaceFolder) {
    // Prevent concurrent refreshes
    if (this.refreshInProgress) {
      return;
    }

    this.refreshInProgress = true;

    try {
      this.installedDeps = await this.vendorLibraries.getCurrentlyInstalledLibraries(workspace);
      this.installedList = [];
      this.availableDepsList = [];

      this.availableDeps = await this.getAvailableDependencies();

      if (this.installedDeps.length !== 0) {
        for (const id of this.installedDeps) {
          let versionList = [{ version: id.version, buttonText: i18n('ui', 'To Latest') }];
          for (const ad of this.availableDeps) {
            if (id.uuid === ad.uuid) {
              if (id.version !== ad.version) {
                versionList.push({
                  version: ad.version,
                  buttonText: isNewerVersion(ad.version, id.version)
                    ? i18n('ui', 'Update')
                    : i18n('ui', 'Downgrade'),
                });
              }
            }
          }
          versionList = this.sortVersions(versionList);

          this.installedList.push({
            name: id.name,
            currentVersion: id.version,
            versionInfo: versionList,
          });
        }
      }

      this.availableDeps.forEach((dep) => {
        const installedDep = this.installedDeps.findIndex((depend) => depend.uuid === dep.uuid);
        if (installedDep < 0) {
          const foundDep = this.availableDepsList.findIndex((depend) => depend.uuid === dep.uuid);
          if (foundDep < 0) {
            this.availableDepsList.push(dep);
          } else if (isNewerVersion(dep.version, this.availableDepsList[foundDep].version)) {
            this.availableDepsList[foundDep] = dep;
          }
        }
      });

      this.sortInstalled();
      this.sortAvailable();

      this.updateDependencies();
    } finally {
      this.refreshInProgress = false;
    }
  }

  public async refresh() {
    if (this.wp) {
      void this._refresh(this.wp);
    }
  }

  private sortVersions(
    versionList: { version: string; buttonText: string }[]
  ): { version: string; buttonText: string }[] {
    versionList.sort((a, b) => {
      if (isNewerVersion(a.version, b.version)) {
        return -1;
      } else if (a.version === b.version) {
        return 0;
      } else {
        return 1;
      }
    });
    return versionList;
  }

  private sortInstalled() {
    this.installedList.sort((a, b) => {
      if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
      } else if (a.name.toLowerCase() === b.name.toLowerCase()) {
        return 0;
      } else {
        return -1;
      }
    });
  }

  private sortInstalledDeps() {
    this.installedDeps.sort((a, b) => {
      if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
      } else if (a.name.toLowerCase() === b.name.toLowerCase()) {
        return 0;
      } else {
        return -1;
      }
    });
  }

  private sortAvailable() {
    this.availableDepsList.sort((a, b) => {
      if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
      } else if (a.name.toLowerCase() === b.name.toLowerCase()) {
        return 0;
      } else {
        return -1;
      }
    });
  }

  public async getAvailableDependencies(): Promise<IJsonList[]> {
    this.homeDeps = [];
    if (this.wp === undefined) {
      this.onlineDeps = [];
    } else {
      const projectYear = this.externalApi
        .getPreferencesAPI()
        .getPreferences(this.wp)
        .getProjectYear();
      const manifestURL = this.vendordepMarketplaceURL + `${projectYear}.json`;
      try {
        this.onlineDeps = await this.loadFileFromUrl(manifestURL);
      } catch (err) {
        logger.log('Error fetching vendordep marketplace manifest', manifestURL, err);
        this.onlineDeps = [];
      }
    }
    this.homeDeps = await this.vendorLibraries.getHomeDirDeps();
    this.homeDeps.forEach((homedep) => {
      const depList: IJsonList = {
        path: i18n('ui', homedep.jsonUrl),
        name: i18n('ui', homedep.name),
        version: i18n('ui', homedep.version),
        uuid: i18n('ui', homedep.uuid),
        description: i18n('ui', 'Loaded from Local Copy'),
        website: i18n('ui', 'Loaded from Local Copy'),
      };
      const found = this.onlineDeps.find(
        (onlinedep) => onlinedep.uuid === depList.uuid && onlinedep.version === depList.version
      );
      if (!found) {
        this.onlineDeps.push(depList);
      }
    });

    return this.onlineDeps;
  }

  protected async loadFileFromUrl(url: string): Promise<IJsonList[]> {
    const response = await fetch(url, {
      timeout: 5000,
    } as NodeFetchOptions);
    if (response === undefined) {
      throw new Error('Failed to fetch file');
    }
    if (response.status >= 200 && response.status <= 300) {
      const text = await response.text();
      const json = JSON.parse(text) as IJsonList[];
      if (this.isJsonList(json)) {
        return json;
      } else {
        throw new Error('Incorrect JSON format');
      }
    } else {
      throw new Error('Bad status ' + response.status);
    }
  }

  private isJsonList(jsonDepList: IJsonList[]): jsonDepList is IJsonList[] {
    return jsonDepList.every((jsonDep) => {
      return (
        jsonDep.path !== undefined &&
        jsonDep.name !== undefined &&
        jsonDep.uuid !== undefined &&
        jsonDep.version !== undefined &&
        jsonDep.description !== undefined &&
        jsonDep.website !== undefined
      );
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const createUri = (fp: string) => {
      return webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...fp.split('/')));
    };

    const styleUri = createUri(`resources/media/main.css`);
    const vscodeElementsUri = createUri(`resources/media/vscode-elements.css`);
    const codiconUri = createUri(`resources/media/icons.css`);
    const scriptUri = createUri(`resources/dist/dependencyview.js`);

    const htmlPath = path.join(this._extensionUri.fsPath, 'resources', 'dist', 'dependencyview.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const headInsert = `
    <link rel="preload" href="${vscodeElementsUri}" as="style">
    <link rel="preload" href="${styleUri}" as="style">
    <link rel="preload" href="${codiconUri}" as="style">
    <link rel="preload" href="${scriptUri}" as="script">

    <link rel="stylesheet" href="${vscodeElementsUri}">
    <link rel="stylesheet" href="${styleUri}">
    <link rel="stylesheet" href="${codiconUri}" id="vscode-codicon-stylesheet">
  `;

    html = html.replace('</head>', `${headInsert}
</head>`);
    
    // Convert replaceresource/dist/ script tags to webview URIs
    html = html.replace(
      /<script\s+src="replaceresource\/dist\/([^"]+)"><\/script>/g,
      (_match, fileName) => {
        if (fileName === 'dependencyview.js') {
          return `<script src="${scriptUri}"></script>`;
        }
        // For other scripts, convert replaceresource to webview URI
        const otherScriptUri = createUri(`resources/dist/${fileName}`);
        return `<script src="${otherScriptUri}"></script>`;
      }
    );
    
    // Replace remaining replaceresource references
    const extensionUri = webview.asWebviewUri(this._extensionUri);
    html = html.replace(/replaceresource/g, extensionUri.toString());

    return html;
  }
}
