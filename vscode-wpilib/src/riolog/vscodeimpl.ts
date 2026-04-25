'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IDisposable } from './shared/interfaces';
import { IErrorMessage, IPrintMessage } from './shared/message';

export function createRioLogWindowView(resourceRoot: string, disposables: IDisposable[]) {
  const webview = vscode.window.createWebviewPanel(
    'wpilib:riologlive',
    'RioLog',
    vscode.ViewColumn.Three,
    {
      enableCommandUris: true,
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  webview.webview.html = getHTML(webview.webview, resourceRoot);
  disposables.push(webview);

  // Send theme colors when created
  sendThemeColors(webview);

  // Listen for theme changes and update colors
  vscode.window.onDidChangeActiveColorTheme(
    () => {
      sendThemeColors(webview);
    },
    null,
    disposables
  );
  return webview;
}

function sendThemeColors(webview: vscode.WebviewPanel) {
  // Extract key colors from the current theme
  const colors = {
    // These don't have direct VSCode equivalents, so we use custom colors
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
  };

  webview.webview.postMessage({
    type: 'themeColors',
    message: colors,
  });
}

export async function handleSave(saveData: (IPrintMessage | IErrorMessage)[]): Promise<boolean> {
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file('riolog.json'),
    filters: { 'JSON Files': ['json'] },
    saveLabel: 'Save RioLog',
  });

  if (!uri) {
    return false;
  }

  try {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(saveData, null, 2)));

    vscode.window.showInformationMessage(`RioLog saved to ${uri.fsPath}`);
    return true;
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to save RioLog: ${err}`);
    return false;
  }
}

function getHTML(webview: vscode.Webview, resourceRoot: string): string {
  // Get paths to script and CSS
  const scriptPath = vscode.Uri.file(
    path.join(resourceRoot, '..', 'resources', 'dist', 'riologpage.js')
  );
  const cssPath = vscode.Uri.file(path.join(resourceRoot, '..', 'resources', 'media', 'main.css'));

  // Convert to webview URIs
  const scriptUri = webview.asWebviewUri(scriptPath);
  const cssUri = webview.asWebviewUri(cssPath);

  return `<!doctype html>
          <html>
            <head>
              <link rel="stylesheet" href="${cssUri}" />
              <title>WPILib RioLog</title>
            </head>

            <body>
              <div id="mainDiv"></div>
              <script>
                window.addEventListener('error', (event) => {
                  console.error('Error in RioLog script:', event.error);
                });
              </script>
              <script src="${scriptUri}"></script>
            </body>
          </html>`;
}
