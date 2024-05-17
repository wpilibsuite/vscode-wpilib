import * as vscode from 'vscode';
import { ProjectInfoGatherer, IProjectInfo } from './projectinfo';
import { logger } from './logger';
import { VendorLibraries } from './vendorlibraries';

export class DependencyViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'wpilib.dependencyView';
	private projectInfo: ProjectInfoGatherer;
	private vendorLibraries: VendorLibraries;
	private viewInfo: IProjectInfo | undefined;
	private disposables: vscode.Disposable[] = [];

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		projectInfo: ProjectInfoGatherer,
		vendorLibraries: VendorLibraries
	) {
		this.projectInfo = projectInfo;
		this.vendorLibraries = vendorLibraries;

/* 		this.disposables.push(vscode.commands.registerCommand('wpilibcore.getProjectInformation', async () => {
      logger.log('disposing dependency view');
    })); */
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

		if (this.projectInfo) {
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

/* 	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<ul class="color-list">
				</ul>

				<button class="add-color-button">Add Color</button>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	} */

	private _getHtmlForWebview(webview: vscode.Webview): string {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

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
		installedDependencies.forEach(dep => {
				installedHtml += `
						<div>
								<span>${dep.name} (${dep.version})</span>
								<select>
										<option value="v1">v1</option>
										<option value="v2">v2</option>
										<option value="v3">v3</option>
										<option value="v4">v4</option>
										<option value="v5">v5</option>
										<option value="v6">v6</option>
								</select>
								<button>${dep.action}</button>
						</div>
				`;
		});

		// Create HTML for available dependencies
		let availableHtml = '<h2>Available Dependencies</h2>';
		availableDependencies.forEach(dep => {
				availableHtml += `
						<div>
								<div>${dep.name} by ${dep.author} (${dep.downloads} downloads)</div>
								<div>${dep.description}</div>
						</div>
				`;
		});

		// Return the complete HTML
		return `
				<!DOCTYPE html>
				<html lang="en">

				<head>
						<link href="${styleResetUri}" rel="stylesheet">
						<link href="${styleVSCodeUri}" rel="stylesheet">
						<link href="${styleMainUri}" rel="stylesheet">

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
						</style>
				</head>
				<body>
						${installedHtml}
						<hr>
						${availableHtml}
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