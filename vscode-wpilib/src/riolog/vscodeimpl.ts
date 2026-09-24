'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { IDisposable } from './shared/interfaces';
import { IErrorMessage, IPrintMessage } from './shared/message';
import { loadDistWebviewHtml } from '../webviews/distWebviewHtml';

export function createRioLogWindowView(resourceRoot: string, disposables: IDisposable[]) {
  const webview = vscode.window.createWebviewPanel(
    'wpilib:riologlive',
    'RioLog',
    vscode.ViewColumn.Three,
    {
      enableCommandUris: true,
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(resourceRoot, 'media')),
        vscode.Uri.file(path.join(resourceRoot, 'dist')),
      ],
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
  return loadDistWebviewHtml(
    {
      webview,
      extensionRoot: vscode.Uri.file(path.join(resourceRoot, '..')),
      extraCss: [
        vscode.Uri.file(path.join(resourceRoot, 'media', 'vscode-elements.css')),
        vscode.Uri.file(path.join(resourceRoot, 'media', 'riolog.css')),
      ],
    },
    'riolog.html'
  );
}
