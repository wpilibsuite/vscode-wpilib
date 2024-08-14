'use strict';

import { EventEmitter } from 'events';
import * as path from 'path';
import * as vscode from 'vscode';
import { IErrorMessage, IIPCReceiveMessage, IIPCSendMessage, IPrintMessage, IRioConsole, IRioConsoleProvider,
         IWindowProvider, IWindowView, RioConsole } from 'wpilib-riolog';
import { readFileAsync } from '../utilities';

interface IHTMLProvider {
  getHTML(webview: vscode.Webview): string;
}

export class RioLogWindowView extends EventEmitter implements IWindowView {
  private webview: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  constructor(resourceName: string, windowName: string, viewColumn: vscode.ViewColumn) {
    super();
    this.webview = vscode.window.createWebviewPanel(resourceName,
      windowName, viewColumn, {
        enableCommandUris: true,
        enableScripts: true,
        retainContextWhenHidden: true,
      });

    this.disposables.push(this.webview);

    this.webview.onDidChangeViewState((s) => {
      if (s.webviewPanel.visible === true) {
        this.emit('windowActive');
      }
    }, null, this.disposables);

    this.webview.webview.onDidReceiveMessage((data: IIPCReceiveMessage) => {
      this.emit('didReceiveMessage', data);
    }, null, this.disposables);

    this.webview.onDidDispose(() => {
      this.emit('didDispose');
    }, null, this.disposables);
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
    const d = await vscode.workspace.openTextDocument({
      content: JSON.stringify(saveData, null, 4),
      language: 'json',
    });
    await vscode.window.showTextDocument(d);
    return true;
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
    const onDiskPath = vscode.Uri.file(path.join(this.resourceRoot, 'dist', 'riologpage.js'));

    // And get the special URI to use with the webview
    const scriptResourcePath = webview.asWebviewUri(onDiskPath);

    let html = this.html!;
    html += '\r\n<script src="';
    html += scriptResourcePath.toString();
    html += '">\r\n';
    html += '\r\n</script>\r\n';

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

  private constructor() {
  }

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
