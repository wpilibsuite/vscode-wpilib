import * as vscode from 'vscode';
import * as fetch from 'node-fetch';
import { ProjectInfoGatherer, IProjectInfo } from './projectinfo';
import { VendorLibraries } from './vendorlibraries';
import { IJsonDependency } from './shared/vendorlibrariesbase';
import { IExternalAPI } from 'vscode-wpilibapi';
import { isNewerVersion } from './versions';
import { logger } from './logger';

export interface IJsonList {
    path: string;
    name: string;
    version: string;
    uuid: string;
    description: string;
    website: string;
}

export interface IDepInstalled { name: string, currentVersion: string, versionInfo: { version: string, buttonText: string }[] }

export class DependencyViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'wpilib.dependencyView';
	private projectInfo: ProjectInfoGatherer;
	private vendorLibraries: VendorLibraries;
	private viewInfo: IProjectInfo | undefined;
	private disposables: vscode.Disposable[] = [];
	private installedDeps: IJsonDependency[] = [];
	private availableDeps: IJsonList[] = [];
    private availableDepsList: IJsonList[] = [];
	private installedList: IDepInstalled[] = [];
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
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
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

        this.refresh(this.wp);
        webviewView.onDidChangeVisibility(() => {
                if (this.wp) {
                    this.refresh(this.wp);
                }
        });    

		this.viewInfo?.vendorLibraries.forEach(item => console.log(item.name.concat(" / ", item.version)));

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'install':
					{
                        this.install(data.index);
					}
                case 'uninstall':
                    {
                        const uninstall = [this.installedDeps[parseInt(data.index, 10)]];
                        if (this.wp) {
                            this.vendorLibraries.uninstallVendorLibraries(uninstall, this.wp);
                        }
                    }
                case 'update':
                    {
                        this.update(data.version, data.index);
                    }
			}
		});
	}

    private async update(version: string, indexString: string) {
        var index = parseInt(indexString, 10)
        // Make sure we have a workspace
        if (this.wp) {
            // If the version matches the current version then we want to update to latest
            if (version === this.installedList[index].currentVersion) {
                // Get the version of the first element of the array AKA the latest version
                var versionToInstall = this.installedList[index].versionInfo[0].version;
            } else {
                // It isn't the current version so user must have specified something else
                var versionToInstall = version;
            }

            // Match both the name and the version
            const avail = this.availableDeps.find(available => (versionToInstall === available.version && this.installedList[index].name === available.name));
            if (avail) {
                const dep = await this.vendorLibraries.getJsonDepURL(this.ghURL + avail.path);
                this.vendorLibraries.installDependency(dep, this.vendorLibraries.getWpVendorFolder(this.wp), true);
            }
        }
    }

    private async install(index: string) {
        const avail = this.availableDepsList[parseInt(index, 10)];
        if (avail && this.wp) {
            const dep = await this.vendorLibraries.getJsonDepURL(this.ghURL + avail.path);
            this.vendorLibraries.installDependency(dep, this.vendorLibraries.getWpVendorFolder(this.wp), true);
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

        // Check for internet connection
        if (true) {
            // Check Github for the VendorDep list
            if (this.installedDeps.length !== 0) {
                this.availableDeps = await this.getAvailableDependencies();
                this.installedList = [];
                for (const id of this.installedDeps) {
                    let versionList = [{version: id.version, buttonText: 'To Latest'}];
                    for (const ad of this.availableDeps) {
                        if (id.uuid === ad.uuid) {
                            // Populate version array with version and button text
                            if (isNewerVersion(ad.version, id.version)) {
                                versionList.push({version: ad.version, buttonText: 'Update'});
                            } else if (ad.version === id.version) {
                            } else {
                                versionList.push({version: ad.version, buttonText: 'Downgrade'});
                            }
                        }
                    }
                    // Now we need to sort the version list newest to oldest
                    versionList = this.sortVersions(versionList);

                    this.installedList.push({ name: id.name, currentVersion: id.version, versionInfo: versionList });
                }
            }
        }

        // We need to group the available deps and filter out the installed ones
        this.availableDeps.forEach(dep => {
            // See if the dep is one of the installed deps if so don't add it
            let installedDep = this.installedDeps.findIndex(depend => depend.uuid === dep.uuid);
            if (installedDep < 0) {
                // Check to see if it is already in the available list
                let foundDep = this.availableDepsList.findIndex(depend => depend.uuid === dep.uuid);
                if (foundDep < 0) {
                    // Not in the list so just add it
                    this.availableDepsList.push(dep);
                } else if (isNewerVersion(dep.version, this.availableDepsList[foundDep].version)) {
                    // It was in the list but this version is newer so lets use that
                    this.availableDepsList[foundDep] = dep;
                }
            }
        });

        // Make sure the installed version is in the list


        this.updateDependencies();
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

	public async getAvailableDependencies(): Promise<IJsonList[]> {
		const listURL = this.ghURL + `${this.externalApi.getUtilitiesAPI().getFrcYear()}.json`

		return await this.loadFileFromUrl(listURL);
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
      const json = JSON.parse(text);
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
					 && jsonDep.description !== undefined && jsonDep.website !== undefined});
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

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
                <div id="installed-dependencies"></div>            
                <hr>
                <div id="available-dependencies"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}