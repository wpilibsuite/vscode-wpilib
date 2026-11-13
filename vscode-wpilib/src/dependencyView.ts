import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { IProjectInfo, ProjectInfoGatherer } from './projectinfo';
import { VendorLibraries } from './vendorlibraries';
import {
  IAvailableDep,
  IDepInputLabels,
  IInstalledDep,
  IVendorDepProvider,
} from './vendordeps/vendordepprovider';

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

const collator = Intl.Collator('en', { sensitivity: 'base' });
const sort = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);

export class DependencyViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'wpilib.dependencyView';
  private projectInfo: ProjectInfoGatherer;
  private vendorLibraries: VendorLibraries;
  private viewInfo?: IProjectInfo;
  private disposables: vscode.Disposable[] = [];
  private installed: IInstalledDep[] = [];
  private available: IAvailableDep[] = [];
  private installedList: IDepInstalled[] = [];
  private externalApi: IExternalAPI;
  private wp?: vscode.WorkspaceFolder;
  private changed = 0;
  private refreshInProgress = false;
  private showingInstructions = false;

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

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [
        this._extensionUri,
        vscode.Uri.joinPath(this._extensionUri, 'resources', 'media'),
      ],
    };

    this.wp = await this.externalApi.getPreferencesAPI().getFirstOrSelectedWorkspace();
    if (!this.wp) {
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

    await this._refresh(this.wp);
    webviewView.onDidChangeVisibility(async () => {
      if (this.wp) {
        // If the webview becomes visible refresh it, invisible then check for changes
        if (webviewView.visible) {
          await this._refresh(this.wp);
        } else {
          await this.runPostChangeAction();
        }
      }
    });

    this.viewInfo?.vendorLibraries.forEach((item) =>
      console.log(item.name.concat(' / ', item.version))
    );

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      this.getProvider().getInputLabels()
    );

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (this.isJSMessage(data)) {
        switch (data.type) {
          case 'install': {
            await this.install(data.index);
            break;
          }
          case 'uninstall': {
            await this.uninstall(data.index);
            break;
          }
          case 'update': {
            await this.update(data.version, data.index);
            break;
          }
          case 'updateall': {
            await this.updateall();
            break;
          }
          case 'installFromUrl': {
            await this.installFromUrl(data.url);
            break;
          }
          case 'blur': {
            await this.runPostChangeAction();
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

  private getProvider(): IVendorDepProvider {
    return this.vendorLibraries.getProvider(this.wp as vscode.WorkspaceFolder);
  }

  private async runPostChangeAction() {
    if (!this.wp) {
      return;
    }
    if (this.showingInstructions) {
      this.showingInstructions = false;
    } else if (this.changed > this.vendorLibraries.getLastBuild()) {
      await this.vendorLibraries.runPostChangeAction(this.wp);
      this.changed = 0;
    }
  }

  private async update(version: string, indexString: string) {
    const index = parseInt(indexString, 10);
    const dep = this.installed[index];
    if (!this.wp || !dep) {
      return;
    }
    // If the version matches the current version then we want to update to latest
    const versionToInstall =
      version === this.installedList[index].currentVersion
        ? // Get the version of the first element of the array AKA the latest version
          this.installedList[index].versionInfo[0].version
        : // It isn't the current version so user must have specified something else
          version;

    if (await this.getProvider().updateTo(this.wp, dep.key, versionToInstall)) {
      this.changed = Date.now();
    }
    await this._refresh(this.wp);
  }

  private async updateall() {
    if (!this.wp) {
      return;
    }
    const provider = this.getProvider();
    for (const [index, installed] of this.installedList.entries()) {
      const latest = installed.versionInfo[0].version;
      if (latest !== installed.currentVersion) {
        if (await provider.updateTo(this.wp, this.installed[index].key, latest)) {
          this.changed = Date.now();
        }
      }
    }
    await this._refresh(this.wp);
  }

  private async install(indexString: string) {
    const dep = this.available[parseInt(indexString, 10)];
    if (!this.wp || !dep) {
      return;
    }
    if (await this.getProvider().install(this.wp, dep)) {
      this.changed = Date.now();
      if (dep.instructions) {
        this.showingInstructions = true;
      }
    }
    await this._refresh(this.wp);
  }

  private async uninstall(indexString: string) {
    const dep = this.installed[parseInt(indexString, 10)];
    if (!this.wp || !dep) {
      return;
    }
    if (await this.getProvider().uninstall(this.wp, [dep.key])) {
      this.changed = Date.now();
    }
    await this._refresh(this.wp);
  }

  private async installFromUrl(url: string | undefined) {
    if (!url || !this.wp) {
      logger.warn('installFromUrl called with invalid parameters', {
        url,
        hasWorkspace: !!this.wp,
      });
      return;
    }

    if (await this.getProvider().installFromInput(this.wp, url)) {
      this.changed = Date.now();
    }
    await this._refresh(this.wp);
  }

  public async updateDependencies() {
    await this._view?.webview.postMessage({
      type: 'updateDependencies',
      installed: this.installedList,
      available: this.available,
    });
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
      const provider = this.vendorLibraries.getProvider(workspace);
      const { installed, available } = await provider.getSnapshot(workspace);

      this.installed = installed.sort(sort);
      this.installedList = this.installed.map((dep) => this.toViewModel(dep, provider));
      this.available = this.newestOfEach(available, provider).sort(sort);

      await this.updateDependencies();
    } finally {
      this.refreshInProgress = false;
    }
  }

  public async refresh() {
    if (this.wp) {
      await this._refresh(this.wp);
    }
  }

  private toViewModel(dep: IInstalledDep, provider: IVendorDepProvider): IDepInstalled {
    const versionInfo = [{ version: dep.version, buttonText: i18n('ui', 'To Latest') }];
    for (const version of dep.availableVersions) {
      if (
        version !== dep.version &&
        version !== dep.version + ' (prerelease)' &&
        dep.version !== ''
      ) {
        versionInfo.push({
          version,
          buttonText: provider.isNewerVersion(version, dep.version)
            ? i18n('ui', 'Update')
            : i18n('ui', 'Downgrade'),
        });
      }
    }
    versionInfo.sort((a, b) => {
      if (provider.isNewerVersion(a.version, b.version)) {
        return -1;
      } else if (a.version === b.version) {
        return 0;
      } else {
        return 1;
      }
    });
    return { name: dep.name, currentVersion: dep.version, versionInfo };
  }

  private newestOfEach(available: IAvailableDep[], provider: IVendorDepProvider): IAvailableDep[] {
    const newest: IAvailableDep[] = [];
    for (const dep of available) {
      const found = newest.findIndex((other) => other.key === dep.key);
      if (found < 0) {
        newest.push(dep);
      } else if (provider.isNewerVersion(dep.version, newest[found].version)) {
        newest[found] = dep;
      }
    }
    return newest;
  }

  private _getHtmlForWebview(webview: vscode.Webview, labels: IDepInputLabels): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const createUri = (fp: string) => {
      return webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...fp.split('/')));
    };

    const scriptUri = createUri(`resources/media/main.js`);
    const styleUri = createUri(`resources/media/main.css`);
    const vscodeElementsUri = createUri(`resources/media/vscode-elements.css`);
    const codiconUri = createUri(`resources/media/icons.css`);

    // Return the complete HTML
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WPILib Vendor Dependencies</title>
        <link rel="preload" href="${vscodeElementsUri}" as="style">
        <link rel="preload" href="${styleUri}" as="style">
        <link rel="preload" href="${codiconUri}" as="style">
        <link rel="preload" href="${scriptUri}" as="script">

        <link rel="stylesheet" href="${vscodeElementsUri}">
        <link rel="stylesheet" href="${styleUri}">
        <link rel="stylesheet" href="${codiconUri}" id="vscode-codicon-stylesheet">
      </head>
      <body>
        <div class="top-line">
          <button id="updateall-action" class="vscode-button block">
            <i class="codicon codicon-sync"></i>
            Update All Dependencies
          </button>
        </div>

        <details class="vscode-collapsible">
          <summary>
            <i class="codicon codicon-chevron-right icon-arrow"></i>
            <h2 class="title">
              Install from URL
            </h2>
          </summary>
          <div class="url-install-section">
            <div class="url-input-container">
              <input type="text" id="url-input" class="vscode-textfield" placeholder="Enter vendordep ${labels.inputName}..." />
              <button id="install-url-action" class="vscode-button">
                <i class="codicon codicon-cloud-download"></i>
                Install
              </button>
            </div>
            <div class="url-help-text">
              Enter a vendor dependency ${labels.sourceName} to install a library not listed in the available dependencies.
            </div>
          </div>
        </details>

        <details class="vscode-collapsible always-show-actions" open>
          <summary>
            <i class="codicon codicon-chevron-right icon-arrow"></i>
            <h2 class="title">
              Installed Dependencies
            </h2>
            <div class="actions" id="installed-actions"></div>
          </summary>
          <div id="installed-dependencies"></div>
        </details>

        <details class="vscode-collapsible always-show-actions" open>
          <summary>
            <i class="codicon codicon-chevron-right icon-arrow"></i>
            <h2 class="title">
              Available Dependencies
            </h2>
            <div class="actions" id="available-actions"></div>
          </summary>
          <div id="available-dependencies"></div>
        </details>

        <script src="${scriptUri}"></script>
      </body>
    </html>
  `;
  }
}
