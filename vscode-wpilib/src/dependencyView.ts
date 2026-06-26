import * as vscode from 'vscode';
import { IExternalAPI } from './api';
import { localize as i18n } from './locale';
import { logger } from './logger';
import { IProjectInfo, ProjectInfoGatherer } from './projectinfo';
import { getHomeDirDeps, getPyProjectFile, getRequires, getVersions, IJsonDependency, installDependency, IPyProject, parseRequirement } from './shared/vendorlibrariesbase';
import { VendorLibraries } from './vendorlibraries';
import { isNewerVersion } from './versions';
import { readFile } from 'fs/promises';
import { isComponent } from './shared/projectGeneratorUtils';

export interface IJsonList {
  path: string;
  name: string;
  version: string;
  uuid: string;
  description: string;
  website: string;
  python?: string;
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

const collator = Intl.Collator('en', { sensitivity: 'base' });
const sort = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);

export class DependencyViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'wpilib.dependencyView';
  private projectInfo: ProjectInfoGatherer;
  private vendorLibraries: VendorLibraries;
  private viewInfo?: IProjectInfo;
  private disposables: vscode.Disposable[] = [];
  private installedDeps: IJsonDependency[] = []; // The actual dep information that is installed
  private installedPythonDeps: string[] = []; // The actual dep information that is installed
  private availableDeps: IJsonList[] = []; // All available deps
  private availableDepsList: IJsonList[] = []; // Only the deps that are not installed and the latest version
  private onlineDeps: IJsonList[] = []; // The deps from the <year>.json file in the vendor-json-repo
  private installedList: IDepInstalled[] = []; // To display deps in the installed list
  private homeDeps: IJsonDependency[] = []; // These are the offline deps in the home directory
  private externalApi: IExternalAPI;
  //private preferences: IPreferences;
  private vendordepMarketplaceURL = `https://frcmaven.wpi.edu/artifactory/vendordeps/vendordep-marketplace/`;
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

    if(prefs.getCurrentLanguage() === 'python') webviewView.webview.html = this._getPythonHtmlForWebview(webviewView.webview);
    else webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      if (this.isJSMessage(data)) {
        switch (data.type) {
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
      if(this.externalApi.getPreferencesAPI().getPreferences(this.wp).getCurrentLanguage() === 'python') {
        await this.vendorLibraries.updateVersion(await parseRequirement(this.installedList[index].name), version, this.wp.uri.fsPath);
      }
      else await this.getURLInstallDep(avail);
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
    let prefsLanguage = "";
    if(this.wp) prefsLanguage = this.externalApi.getPreferencesAPI().getPreferences(this.wp).getCurrentLanguage();
    if(prefsLanguage === 'python') {
      // vscode.window.showInformationMessage(
      //     i18n('message', 'It may take a few minutes to install a new package') 
      // );
      const available = this.availableDepsList[parseInt(index, 10)];
      if(available.python && this.wp) {
        await this.vendorLibraries.installPythonDependency([available.python], this.wp)
        await this._refresh(this.wp);
      }
    } else {
      const avail = this.availableDepsList[parseInt(index, 10)];
      if (avail && this.wp) {
        await this.getURLInstallDep(avail);
        await this._refresh(this.wp);
      }
    }
  }

  private async uninstall(index: string) {
    if(this.wp && this.externalApi.getPreferencesAPI().getPreferences(this.wp).getCurrentLanguage() !== 'python') {
      this.sortInstalledDeps();
      const uninstall = [this.installedDeps[parseInt(index, 10)]];
      const success = await this.vendorLibraries.uninstallVendorLibraries(uninstall, this.wp);
      if (success) {
        this.changed = Date.now();
      }
      await this._refresh(this.wp);
    } else if (this.wp) {
      this.sortInstalledPythonDeps();
      const uninstall = [this.installedPythonDeps[parseInt(index, 10)]];
      const success = await this.vendorLibraries.uninstallPythonVendorLibraries(uninstall, this.wp);
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
          const success = await installDependency(
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
                  await installDependency(
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

    if(this.externalApi.getPreferencesAPI().getPreferences(this.wp).getCurrentLanguage() === 'python') {
      let result = await this.vendorLibraries.installPythonDependency([url], this.wp);
      if(!result) {
        logger.warn('Unable to install python package');
      }
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
        const success = await installDependency(
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
                await installDependency(
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

  public updateDependencies() {
    this._view?.webview.postMessage({
      type: 'updateDependencies',
      installed: this.installedList,
      available: this.availableDepsList,
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
      if(this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() === 'python') {
        this.installedPythonDeps = await this.vendorLibraries.getCurrentlyInstalledPythonLibraries(workspace);
      }
      else this.installedDeps = await this.vendorLibraries.getCurrentlyInstalledLibraries(workspace);
      this.installedList = [];
      this.availableDepsList = [];
      if(this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() === 'python') {
        this.availableDeps = await this.getAvailablePythonDependencies();
      } else {
        this.availableDeps = await this.getAvailableDependencies()
      }
      if (this.availableDeps.length !== 0 && this.externalApi.getPreferencesAPI().getPreferences(workspace).getCurrentLanguage() !== 'python') {
        // Check Github for the VendorDep list
        for (const id of this.installedDeps) {
          let versionList = [{ version: id.version, buttonText: i18n('ui', 'To Latest') }];
          for (const ad of this.availableDeps) {
            if (id.uuid === ad.uuid) {
              // Populate version array with version and button text
              if (id.version !== ad.version) {
                if (isNewerVersion(ad.version, id.version)) {
                  versionList.push({
                    version: ad.version,
                    buttonText: i18n('ui', 'Update'),
                  });
                } else {
                  versionList.push({
                    version: ad.version,
                    buttonText: i18n('ui', 'Downgrade'),
                  });
                }
              } 
            }

              }
          // Now we need to sort the version list newest to oldest
          versionList = this.sortVersions(versionList);

          this.installedList.push({
            name: id.name,
            currentVersion: id.version,
            versionInfo: versionList,
          });
        } 

        // We need to group the available deps and filter out the installed ones
        this.availableDeps.forEach((dep) => {
          // See if the dep is one of the installed deps if so don't add it
          const installedDep = this.installedDeps.findIndex((depend) => depend.uuid === dep.uuid);
          if (installedDep < 0) {
            // Check to see if it is already in the available list
            const foundDep = this.availableDepsList.findIndex((depend) => depend.uuid === dep.uuid);
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
      } else if(this.availableDeps.length !== 0 && this.wp) {
        for (const id of this.installedPythonDeps) {
          let installedVersion = (await getPyProjectFile(this.wp.uri.fsPath) as IPyProject).tool.robotpy.robotpy_version; 
          if(!isComponent(id)) {
            let req = await this.vendorLibraries.getIRequires(id, this.wp.uri.fsPath);
            if(req) {
              if(req.version) installedVersion = req.version;
              else installedVersion = "";
              let versionList = [{ version: installedVersion, buttonText: i18n('ui', 'To Latest') }];
              for(const ver of req.availableVersions) {
                //still detects it's the same version if the version has (prerelease) after it
                if(ver !== installedVersion && ver !== installedVersion + " (prerelease)" && installedVersion) {
                  if(isNewerVersion(ver, installedVersion)) {
                    versionList.push({
                      version: ver,
                      buttonText: i18n('ui', 'Update'),
                    });
                  } else {
                    versionList.push({
                      version: ver,
                      buttonText: i18n('ui', 'Downgrade'),
                    });
                  }
                } 
              }
                versionList = this.sortVersions(versionList);

                this.installedList.push({
                  name: id,
                  currentVersion: installedVersion,
                  versionInfo: versionList,
                });
              }
          }
          else if (isComponent(id)) {
            let versionList = [{version: installedVersion, buttonText: i18n('ui', 'To Latest')}];
            //Because this is a component, the version is tied to the version of robotpy, so there is no need for version drop-downs
            this.installedList.push({
              name: id,
              currentVersion: installedVersion,
              versionInfo: versionList,
            });
            continue;
          }
        } 

        // We need to group the available deps and filter out the installed ones
        this.availableDeps.forEach((dep) => {
          if(dep.python !== undefined) {
            // See if the dep is one of the installed deps if so don't add it
            const installedDep = this.installedPythonDeps.findIndex((depend) => depend === dep.python);
            if (installedDep < 0) {
              // Check to see if it is already in the available list
              const foundDep = this.availableDepsList.findIndex((depend) => depend.name === dep.python);
              if (foundDep < 0 && dep.python) {
                // Not in the list so just add it
                dep.name = dep.python;
                this.availableDepsList.push(dep);
              } else if (isNewerVersion(dep.version, this.availableDepsList[foundDep].version)) {
                dep.name = dep.python;
                // It was in the list but this version is newer so lets use that
                this.availableDepsList[foundDep] = dep;
              }
            }
          }
        });

        this.sortInstalled();
        this.sortAvailable();
        this.updateDependencies();
      }
    } finally {
      this.refreshInProgress = false;
    }
  }

  public async refresh() {
    if (this.wp) {
      await this._refresh(this.wp);
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
    this.installedList.sort(sort);
  }

  private sortInstalledDeps() {
    this.installedDeps.sort(sort);
  }

  private sortInstalledPythonDeps() {
    this.installedPythonDeps.sort();
  }

  private sortAvailable() {
    this.availableDepsList.sort(sort);
  }

  public async getAvailableDependencies(): Promise<IJsonList[]> {
    this.homeDeps = [];
    if (!this.wp) {
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
    this.homeDeps = await getHomeDirDeps();
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
  public async getAvailablePythonDependencies(): Promise<IJsonList[]> {
    this.homeDeps = [];
    if (!this.wp) {
      this.onlineDeps = [];
    } else {
      const projectYear = this.externalApi
        .getPreferencesAPI()
        .getPreferences(this.wp)
        .getProjectYear();
      const manifestURL = this.vendordepMarketplaceURL + `${projectYear}.json`;
      try {
        this.onlineDeps = JSON.parse(await readFile("C:\\Users\\awallis\\Downloads\\2027_alpha5 (2).json", 'utf8')) as IJsonList[];
      } catch (err) {
        logger.log('Error fetching vendordep marketplace manifest', manifestURL, err);
        this.onlineDeps = [];
      }
    }
    this.homeDeps = await getHomeDirDeps();
    this.homeDeps.forEach((homedep) => {
      const depList: IJsonList = {
        path: i18n('ui', homedep.jsonUrl),
        name: i18n('ui', homedep.name),
        version: i18n('ui', homedep.version),
        uuid: i18n('ui', homedep.uuid),
        description: i18n('ui', 'Loaded from Local Copy'),
        website: i18n('ui', 'Loaded from Local Copy')
      };
      const found = this.onlineDeps.find(
        (onlinedep) => onlinedep.uuid === depList.uuid && onlinedep.version === depList.version
      );
      if (!found) {
        if(isComponent(homedep.fileName.substring(0, homedep.fileName.length - 5))) {
          depList.python = homedep.fileName.substring(0, homedep.fileName.length - 5);
          this.onlineDeps.push(depList);
        }
      }
    });
    let req = await this.vendorLibraries.getPythonRequirements();
    req.forEach((requirement) => {
      const depList: IJsonList = {
        path: i18n('ui', ''),
        name: i18n('ui', requirement),
        version: i18n('ui', ''),
        uuid: i18n('ui', ''),
        python: requirement,
        description: i18n('ui', 'Entered package name'),
        website: i18n('ui', 'Entered package name')
      };
      const found = this.onlineDeps.find(
        (onlinedep) => onlinedep.python === depList.python
      );
      if(!found) {
        this.onlineDeps.push(depList);
      } 
    });
    let dep = this.onlineDeps.at(0);
    const ret: string[] = [];
    for(let i = 0; i < this.onlineDeps.length; i++) {
      dep = this.onlineDeps.at(i);
      if(dep) {
        if(!dep.python) {
          this.onlineDeps.splice(this.onlineDeps.indexOf(dep), 1);
          i--;
        } else if (ret.indexOf(dep.name) !== -1) {
          this.onlineDeps.splice(this.onlineDeps.indexOf(dep), 1);
          i--;
        } else {
          ret.push(dep.name);
        }
      }
    }
    return this.onlineDeps;
  }

  protected async loadFileFromUrl(url: string): Promise<IJsonList[]> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const json = (await response.json()) as IJsonList[];
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
    return jsonDepList.every(
      (jsonDep) =>
        jsonDep.path !== undefined &&
        jsonDep.name !== undefined &&
        jsonDep.uuid !== undefined &&
        jsonDep.version !== undefined &&
        jsonDep.description !== undefined &&
        jsonDep.website !== undefined
    );
  }

  private _getPythonHtmlForWebview(webview: vscode.Webview): string {
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
              <input type="text" id="url-input" class="vscode-textfield" placeholder="Enter vendordep URL..." />
              <button id="install-url-action" class="vscode-button">
                <i class="codicon codicon-cloud-download"></i>
                Install
              </button>
            </div>
            <div class="url-help-text">
              Enter a vendor dependency Python Package name to install a library not listed in the available dependencies.
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


  private _getHtmlForWebview(webview: vscode.Webview): string {
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
              <input type="text" id="url-input" class="vscode-textfield" placeholder="Enter vendordep URL..." />
              <button id="install-url-action" class="vscode-button">
                <i class="codicon codicon-cloud-download"></i>
                Install
              </button>
            </div>
            <div class="url-help-text">
              Enter a vendor dependency JSON URL to install a library not listed in the available dependencies.
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
