'use strict';

import { EventEmitter } from 'events';
import * as path from 'path';
import * as vscode from 'vscode';
import { IErrorMessage, IPrintMessage } from './shared/message';
import {
  IIPCReceiveMessage,
  IIPCSendMessage,
  IRioConsole,
  IRioConsoleProvider,
  IWindowProvider,
  IWindowView,
} from './shared/interfaces';
import { RioConsole } from './rioconsole';
import { readFileAsync } from '../utilities';

interface IHTMLProvider {
  getHTML(webview: vscode.Webview): string;
}

export class RioLogWindowView extends EventEmitter implements IWindowView {
  private webview: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  constructor(resourceName: string, windowName: string, viewColumn: vscode.ViewColumn) {
    super();
    this.webview = vscode.window.createWebviewPanel(resourceName, windowName, viewColumn, {
      enableCommandUris: true,
      enableScripts: true,
      retainContextWhenHidden: true,
    });

    this.disposables.push(this.webview);

    this.webview.onDidChangeViewState(
      (s) => {
        if (s.webviewPanel.visible === true) {
          this.emit('windowActive');
        }
      },
      null,
      this.disposables
    );

    this.webview.webview.onDidReceiveMessage(
      (data: IIPCReceiveMessage) => {
        this.emit('didReceiveMessage', data);
      },
      null,
      this.disposables
    );

    this.webview.onDidDispose(
      () => {
        this.emit('didDispose');
      },
      null,
      this.disposables
    );

    // Send theme colors when created
    this.sendThemeColors();

    // Listen for theme changes and update colors
    vscode.window.onDidChangeActiveColorTheme(
      () => {
        this.sendThemeColors();
      },
      null,
      this.disposables
    );
  }

  private sendThemeColors() {
    // Extract key colors from the current theme
    const colors = {
      // These don't have direct VSCode equivalents, so we use custom colors
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
    };

    this.webview.webview.postMessage({
      type: 'themeColors',
      message: colors,
    });
  }

  public getWebview(): vscode.Webview {
    return this.webview.webview;
  }

  public setHTML(html: string): void {
    this.webview.webview.html = html;
  }

  public async postMessage(message: IIPCSendMessage): Promise<boolean> {
    return this.webview.webview.postMessage(message);
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  public async handleSave(saveData: (IPrintMessage | IErrorMessage)[]): Promise<boolean> {
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
}

export class RioLogHTMLProvider implements IHTMLProvider {
  public static async Create(resourceRoot: string): Promise<RioLogHTMLProvider> {
    const provider = new RioLogHTMLProvider(resourceRoot);
    const htmlFile = path.join(resourceRoot, 'live.html');
    provider.html = await readFileAsync(htmlFile, 'utf8');
    return provider;
  }

  private readonly resourceRoot: string;
  private html?: string;

  private constructor(resourceRoot: string) {
    this.resourceRoot = resourceRoot;
  }

  public getHTML(webview: vscode.Webview): string {
    // Get paths to script and CSS
    const scriptPath = vscode.Uri.file(
      path.join(this.resourceRoot, '..', 'resources', 'dist', 'riologpage.js')
    );
    const elementsCssPath = vscode.Uri.file(
      path.join(this.resourceRoot, '..', 'resources', 'media', 'vscode-elements.css')
    );
    const rioLogCssPath = vscode.Uri.file(
      path.join(this.resourceRoot, '..', 'resources', 'media', 'riolog.css')
    );

    // Convert to webview URIs
    const scriptUri = webview.asWebviewUri(scriptPath);
    const elementsCssUri = webview.asWebviewUri(elementsCssPath);
    const rioLogCssUri = webview.asWebviewUri(rioLogCssPath);

    let html = this.html!;

    // Add CSS link
    html = html.replace(
      '</head>',
      `<link rel="stylesheet" href="${elementsCssUri}" />
      <link rel="stylesheet" href="${rioLogCssUri}" />\r\n</head>`
    );

    // Add script with error handling
    html = html.replace(
      '</body>',
      `<script>
        window.addEventListener('error', (event) => {
          console.error('Error in RioLog script:', event.error);
        });
      </script>
      <script src="${scriptUri}"></script>
      </body>`
    );

    return html;
  }
}

export class RioLogWebviewProvider implements IWindowProvider {
  public static async Create(resourceRoot: string): Promise<RioLogWebviewProvider> {
    const provider = new RioLogWebviewProvider();
    provider.htmlProvider = await RioLogHTMLProvider.Create(resourceRoot);
    return provider;
  }

  private htmlProvider: RioLogHTMLProvider | undefined;

  private constructor() {}

  public createWindowView(): IWindowView {
    const wv = new RioLogWindowView('wpilib:riologlive', 'RioLog', vscode.ViewColumn.Three);
    wv.setHTML(this.htmlProvider!.getHTML(wv.getWebview()));
    return wv;
  }
}

export class LiveRioConsoleProvider implements IRioConsoleProvider {
  public getRioConsole(): IRioConsole {
    return new RioConsole();
  }
}
