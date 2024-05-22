import * as vscode from 'vscode';
import * as fetch from 'node-fetch';
import { ProjectInfoGatherer, IProjectInfo } from './projectinfo';
import { VendorLibraries } from './vendorlibraries';
import { IJsonDependency } from './shared/vendorlibrariesbase';
import { IExternalAPI } from 'vscode-wpilibapi';
import { isNewerVersion } from './versions';

export interface IJsonList {
  url: string;
	name: string;
  version: string;
  uuid: string;
  description: string;
  website: string;
}

export interface IDepInstalled { name: string, currentVersion: string, versions: string[], action: string }

export class DependencyViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'wpilib.dependencyView';
	private projectInfo: ProjectInfoGatherer;
	private vendorLibraries: VendorLibraries;
	private viewInfo: IProjectInfo | undefined;
	private disposables: vscode.Disposable[] = [];
	private installedDeps: IJsonDependency[] = [];
	private availableDeps: IJsonList[] = [];
	private installedList: IDepInstalled[] = [];
	private externalApi: IExternalAPI;

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

		let workspace: vscode.WorkspaceFolder | undefined;
		if (this.projectInfo && workspace) {
			this.viewInfo = await this.projectInfo.getViewInfo();
		}

		this.viewInfo?.vendorLibraries.forEach(item => console.log(item.name.concat(" / ", item.version)));

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
			}
		});
	}

	public addDependency() {
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({ type: 'addDependency' });
		}
	}

	public clearDependencies() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearDependecies' });
		}
	}

	public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

	public async refresh() {
		let workspace: vscode.WorkspaceFolder | undefined;
		if (workspace !== undefined) {
			this.installedDeps = await this.vendorLibraries.getCurrentlyInstalledLibraries(workspace);

			// Check for internet connection
			if (true) {
				// Check Github for the VendorDep list
				if (this.installedDeps.length !== 0) {
					this.availableDeps = await this.getAvailableDependencies();
					const updatableDeps = [];
					for (const ad of this.availableDeps) {
						for (const id of this.installedDeps) {
							if (id.uuid === ad.uuid) {
								// Maybe update available
								if (isNewerVersion(ad.version, id.version)) {
									
								}
								continue;
							}
						}
					}
				}
			}
		}

		if (this._view) {
			this._view.webview.postMessage({ type: 'updateDependencies', data: this.installedList });
		}
	}

	public async getAvailableDependencies(): Promise<IJsonList[]> {
		const ghURL = `https://github.com/wpilibsuite/vendor-json-repo/blob/master/${this.externalApi.getUtilitiesAPI().getFrcYear()}.json`

		return await this.loadFileFromUrl(ghURL);
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
	
	private isJsonList(jsonDep: any): jsonDep is IJsonList[] {	
		return jsonDep.url !== undefined && jsonDep.name !== undefined
					 && jsonDep.uuid !== undefined && jsonDep.version !== undefined
					 && jsonDep.description !== undefined && jsonDep.website !== undefined;
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

    // Fake data for installed vendor dependencies
    const installedDependencies = [
				{ name: 'CTRE-Phoenix', version: 'v6', action: 'Update' },
				{ name: 'REV-Software', version: 'v5', action: 'Uninstall' },
				{ name: 'WPI-Lib', version: 'v4', action: 'Update' },
				{ name: 'NavX-Sensor', version: 'v3', action: 'Uninstall' }
		];

    // Fake data for available dependencies
    const availableDependencies = [
        {
            name: 'PhotonLib',
            author: 'PhotonVision',
            downloads: 743,
            description: 'Accompanying library for using PhotonVision on a coprocessor'
        },
        {
            name: 'VendorLib1',
            author: 'Author1',
            downloads: 500,
            description: 'Description for VendorLib1'
        },
        {
            name: 'VendorLib2',
            author: 'Author2',
            downloads: 300,
            description: 'Description for VendorLib2'
        },
        {
            name: 'VendorLib3',
            author: 'Author3',
            downloads: 200,
            description: 'Description for VendorLib3'
        },
        {
            name: 'VendorLib4',
            author: 'Author4',
            downloads: 1000,
            description: 'Description for VendorLib4'
        },
        {
            name: 'VendorLib5',
            author: 'Author5',
            downloads: 750,
            description: 'Description for VendorLib5'
        },
        {
            name: 'VendorLib6',
            author: 'Author6',
            downloads: 650,
            description: 'Description for VendorLib6'
        },
        {
            name: 'VendorLib7',
            author: 'Author7',
            downloads: 550,
            description: 'Description for VendorLib7'
        },
        {
            name: 'VendorLib8',
            author: 'Author8',
            downloads: 450,
            description: 'Description for VendorLib8'
        }
    ];

    // Create HTML for installed dependencies
    let installedHtml = '<h2>Installed Vendor Dependencies</h2>';
    installedDependencies.forEach((dep, index) => {
        installedHtml += `
            <div class="installed-dependency">
                <span>${dep.name}</span>
                <select id="version-select-${index}">
                </select>
                <button>${dep.action}</button>
            </div>
        `;
    });

    // Create HTML for available dependencies
    let availableHtml = '<h2>Available Dependencies</h2>';
    availableDependencies.forEach(dep => {
        availableHtml += `
            <div class="available-dependency">
                <div class="top-line">
                    <span class="name">${dep.name}</span>
                    <span class="downloads">${dep.downloads}<span class="icon">⬇️</span></span>
                </div>
                <div class="details">${dep.author} - ${dep.description}</div>
            </div>
        `;
    });

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
            ${installedHtml}
            <hr>
            ${availableHtml}
						<script src="${scriptUri}"></script>
        </body>
        </html>
    `;
	}
}

/* function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
} */