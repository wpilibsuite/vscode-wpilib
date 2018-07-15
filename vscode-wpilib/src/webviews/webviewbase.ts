'use strict';

import * as vscode from 'vscode';
import { extensionContext, promisifyReadFile } from '../utilities';

export abstract class WebViewBase {
  protected html: string = '';
  protected webview: vscode.WebviewPanel | undefined;
  protected disposables: vscode.Disposable[] = [];
  protected veiwType: string;
  protected title: string;

  protected constructor(viewType: string, title: string) {
    this.veiwType = viewType;
    this.title = title;
  }

  public async loadWebpage(htmlPath: string, scriptPath?: string): Promise<void> {
    this.html = await promisifyReadFile(htmlPath);
    if (scriptPath) {
      const script = await promisifyReadFile(scriptPath);
      this.html = this.html.replace(/replacescript/g, script);
    }
    const onDiskPath = vscode.Uri.file(extensionContext.extensionPath);
    const replacePath = onDiskPath.with({ scheme: 'vscode-resource' });
    this.html = this.html.replace(/replaceresource/g, replacePath.toString());
  }

  public displayWebView(showOptions: vscode.ViewColumn | {preserveFocus: boolean, viewColumn: vscode.ViewColumn},
                        reveal?: boolean, options?: vscode.WebviewPanelOptions & vscode.WebviewOptions) {
    if (this.webview === undefined) {
      this.webview = vscode.window.createWebviewPanel(this.veiwType, this.title, showOptions, options);
      this.webview.webview.html = this.html;
      this.webview.onDidDispose(() => {
        this.webview = undefined;
      });
    }
    if (reveal) {
      this.webview.reveal();
    }
  }

  public dispose() {
    if (this.webview !== undefined) {
      this.webview.dispose();
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
