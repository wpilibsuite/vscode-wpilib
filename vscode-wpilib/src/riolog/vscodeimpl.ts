'use strict';

import { EventEmitter } from 'events';
import * as path from 'path';
import * as vscode from 'vscode';
import { IErrorMessage, IIPCReceiveMessage, IIPCSendMessage, IPrintMessage, IRioConsole, IRioConsoleProvider,
         IWindowProvider, IWindowView, RioConsole } from 'wpilib-riolog';
import { readFileAsync } from '../utilities';

interface IHTMLProvider {
  getHTML(): string;
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

  public async handleSave(saveData: Array<IPrintMessage | IErrorMessage>): Promise<boolean> {
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
    const provider = new RioLogHTMLProvider();
    const htmlFile = path.join(resourceRoot, 'live.html');

    const onDiskPath = vscode.Uri.file(path.join(resourceRoot, 'dist', 'riologpage.js'));

    // And get the special URI to use with the webview
    const scriptResourcePath = onDiskPath.with({ scheme: 'vscode-resource' });

    provider.html = await readFileAsync(htmlFile, 'utf8');
    provider.html += '\r\n<script src="';
    provider.html += scriptResourcePath.toString();
    provider.html += '">\r\n';
    provider.html += '\r\n</script>\r\n';
    return provider;
  }

  private html: string | undefined;

  private constructor() {
  }

  public getHTML(): string {
    if (this.html === undefined) {
      return '';
    }
    return this.html;
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
    // tslint:disable-next-line:no-non-null-assertion
    wv.setHTML(this.htmlProvider!.getHTML());
    return wv;
  }
}

export class LiveRioConsoleProvider implements IRioConsoleProvider {
  public getRioConsole(): IRioConsole {
    return new RioConsole();
  }
}
