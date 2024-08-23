import * as vscode from 'vscode';
import * as fetch from 'node-fetch';
import { ProjectInfoGatherer, IProjectInfo } from './projectinfo';
import { VendorLibraries } from './vendorlibraries';
import { IJsonDependency } from './shared/vendorlibrariesbase';
import { IExternalAPI } from 'vscode-wpilibapi';
import { isNewerVersion } from './versions';
import { logger } from './logger';
import { localize as i18n } from './locale';

export interface IJsonList {
  path: string;
  name: string;
  version: string;
  uuid: string;
  description: string;
  website: string;
}

export interface IDepInstalled { name: string; currentVersion: string; versionInfo: { version: string, buttonText: string }[]; }

export interface IJSMessage { type: string; version: string; index: string; }

export class DependencyViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'wpilib.dependencyView';
  private projectInfo: ProjectInfoGatherer;
  private vendorLibraries: VendorLibraries;
  private viewInfo: IProjectInfo | undefined;
  private disposables: vscode.Disposable[] = [];
  private installedDeps: IJsonDependency[] = [];
  private availableDeps: IJsonList[] = [];
  private availableDepsList: IJsonList[] = [];
  private onlineDeps: IJsonList[] = [];
  private installedList: IDepInstalled[] = [];
  private homeDeps: IJsonDependency[] = [];
  private externalApi: IExternalAPI;
  private ghURL = `https://raw.githubusercontent.com/jasondaming/vendor-json-repo/ctre2024/`;
  private wp: vscode.WorkspaceFolder | undefined;

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
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        this._extensionUri,
                vscode.Uri.joinPath(this._extensionUri, 'media')
      ]
    };

    this.wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (this.wp === undefined) {
      logger.warn('no workspace');
      return;
    }

    if (this.projectInfo) {
      this.viewInfo = await this.projectInfo.getViewInfo();
    }

    void this.refresh(this.wp);
    webviewView.onDidChangeVisibility(() => {
      if (this.wp) {
          void this.refresh(this.wp);
      }
    });

    this.viewInfo?.vendorLibraries.forEach(item => console.log(item.name.concat(' / ', item.version)));

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(data => {
      if (this.isJSMessage(data)) {
        switch (data.type) {
          case 'install':
            {
                          void this.install(data.index);
                          break;
            }
          case 'uninstall':
            {
                void this.uninstall(data.index);
                break;
            }
          case 'update':
            {
                void this.update(data.version, data.index);
                break;
            }
          case 'updateall':
            {
                void this.updateall();
                break;
            }
          case 'refresh':
            {
                if (this.wp) {
                    void this.refresh(this.wp);
                }
                break;
            }
          default:
            {
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
      const versionToInstall = (version === this.installedList[index].currentVersion)
        // Get the version of the first element of the array AKA the latest version
        ? this.installedList[index].versionInfo[0].version
        // It isn't the current version so user must have specified something else
        : version;

      // Match both the name and the version
      const avail = this.availableDeps.find(available =>
        (versionToInstall === available.version && this.installedList[index].name === available.name));
      await this.getURLInstallDep(avail);
      await this.refresh(this.wp);
    }
  }

  private async updateall() {
    if (this.wp) {
      for (const installed of this.installedList) {
        if (installed.versionInfo[0].version !== installed.currentVersion && this.wp) {
          // Match both the name and the version
          const avail = this.availableDeps.find(available =>
            (installed.versionInfo[0].version === available.version && installed.name === available.name));
          await this.getURLInstallDep(avail);
        }
      }

      await this.refresh(this.wp);
    }
  }

  private async install(index: string) {
    const avail = this.availableDepsList[parseInt(index, 10)];
    if (avail && this.wp) {
        await this.getURLInstallDep(avail);
        await this.refresh(this.wp);
    }
  }

  private async uninstall(index: string) {
    const uninstall = [this.installedDeps[parseInt(index, 10)]];
    if (this.wp) {
      await this.vendorLibraries.uninstallVendorLibraries(uninstall, this.wp);
      await this.refresh(this.wp);
    }
  }

  private async getURLInstallDep(avail: IJsonList | undefined) {
    if (avail && this.wp) {
      // Check to see if it is already a URL
      let url = avail.path;
      if (url.substring(0, 4) !== 'http') {
        url = this.ghURL + url;
      }
      let dep;
      try {
        dep = await this.vendorLibraries.getJsonDepURL(url);
      } catch {
        dep = this.homeDeps.find(homdep => homdep.uuid === avail.uuid && homdep.version === avail.version);
      }

      if (dep) {
        const success = await this.vendorLibraries.installDependency(dep, this.vendorLibraries.getWpVendorFolder(this.wp), true);

        if (success) {
          this.vendorLibraries.offerBuild(this.wp);
        }
      }
    }
  }

  public addDependency() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'addDependency' });
    }
  }

  public updateDependencies() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'updateDependencies', installed: this.installedList, available: this.availableDepsList });
    }
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public async refresh(workspace: vscode.WorkspaceFolder) {
    this.installedDeps = await this.vendorLibraries.getCurrentlyInstalledLibraries(workspace);
    this.installedList = [];
    this.availableDepsList = [];

    this.availableDeps = await this.getAvailableDependencies();
    if (this.availableDeps.length !== 0) {
      // Check Github for the VendorDep list
      if (this.installedDeps.length !== 0) {
        for (const id of this.installedDeps) {
          let versionList = [{version: id.version, buttonText: i18n('ui', 'To Latest')}];
          for (const ad of this.availableDeps) {
            if (id.uuid === ad.uuid) {
              // Populate version array with version and button text
              if (id.version !== ad.version) {
                if (isNewerVersion(ad.version, id.version)) {
                  versionList.push({version: ad.version, buttonText: i18n('ui', 'Update')});
                } else {
                  versionList.push({version: ad.version, buttonText: i18n('ui', 'Downgrade')});
                }
              }
            }
          }
          // Now we need to sort the version list newest to oldest
          versionList = this.sortVersions(versionList);

          this.installedList.push({ name: id.name, currentVersion: id.version, versionInfo: versionList });
        }
      }

      // We need to group the available deps and filter out the installed ones
      this.availableDeps.forEach(dep => {
        // See if the dep is one of the installed deps if so don't add it
        const installedDep = this.installedDeps.findIndex(depend => depend.uuid === dep.uuid);
        if (installedDep < 0) {
          // Check to see if it is already in the available list
          const foundDep = this.availableDepsList.findIndex(depend => depend.uuid === dep.uuid);
          if (foundDep < 0) {
            // Not in the list so just add it
            this.availableDepsList.push(dep);
          } else if (isNewerVersion(dep.version, this.availableDepsList[foundDep].version)) {
            // It was in the list but this version is newer so lets use that
            this.availableDepsList[foundDep] = dep;
          }
        }
      });

      this.sortInstalled();
      this.sortAvailable();

      this.updateDependencies();
    }
  }

  private sortVersions(versionList: { version: string, buttonText: string }[]): { version: string, buttonText: string }[] {
    versionList.sort((a, b) => {
      if (isNewerVersion(a.version, b.version)) {
        return -1;
      }
      else if (a.version === b.version) {
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
      }
      else if (a.name.toLowerCase() === b.name.toLowerCase()) {
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
      }
      else if (a.name.toLowerCase() === b.name.toLowerCase()) {
        return 0;
      } else {
        return -1;
      }
    });
  }

  public async getAvailableDependencies(): Promise<IJsonList[]> {
    this.homeDeps = [];
    const listURL = this.ghURL + `${this.externalApi.getUtilitiesAPI().getFrcYear()}.json`;
    try {
      this.onlineDeps = await this.loadFileFromUrl(listURL);
    } catch (err) {
      logger.log('Error fetching file', err);
      this.onlineDeps = [];
    }
    this.homeDeps = await this.vendorLibraries.getHomeDirDeps();
    this.homeDeps.forEach(homedep => {
      const depList: IJsonList = {
          path: i18n('ui', homedep.jsonUrl),
          name: i18n('ui', homedep.name),
          version: i18n('ui', homedep.version),
          uuid: i18n('ui', homedep.uuid),
          description: i18n('ui', 'Loaded from Local Copy'),
          website: i18n('ui', 'Loaded from Local Copy')
      };
      const found = this.onlineDeps.find(onlinedep => onlinedep.uuid === depList.uuid && onlinedep.version === depList.version);
      if (!found) {
          this.onlineDeps.push(depList);
      }
    });

    return this.onlineDeps;
  }

  protected async loadFileFromUrl(url: string): Promise<IJsonList[]> {
    const response = await fetch.default(url, {
      timeout: 5000,
    });
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
    return jsonDepList.every(jsonDep => {
                    return jsonDep.path !== undefined && jsonDep.name !== undefined
           && jsonDep.uuid !== undefined && jsonDep.version !== undefined
           && jsonDep.description !== undefined && jsonDep.website !== undefined; });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
    const trashUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'trash-can-solid.png'));

        // Return the complete HTML
    return `
            <!DOCTYPE html>
            <html lang="en">
                    <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Vendor Dependencies</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                    }
                    .installed-dependency, .available-dependency {
                        margin-bottom: 10px;
                    }
                    hr {
                        margin: 40px 0;
                        border: none;
                        border-top: 1px solid #ccc;
                    }
                    .top-line {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .name {
                        font-weight: bold;
                    }
                    .downloads {
                        display: flex;
                        align-items: center;
                    }
                    .icon {
                        margin-left: 5px;
                    }
                    .details {
                        margin-top: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="top-line">
                    <button id="updateall-action">Update All</button><button id="refresh-action">Refresh</button>
                </div>
                <div id="installed-dependencies"></div>
                <hr>
                <div id="available-dependencies"></div>
                <div id="trashicon" style="display:none;">${trashUri}</div>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
  }
}
