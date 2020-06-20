'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { loadLocaleFile } from '../locale';
import { extensionContext, readFileAsync } from '../utilities';

export abstract class WebViewBase {
  protected html: string = '';
  protected webview: vscode.WebviewPanel | undefined;
  protected disposables: vscode.Disposable[] = [];
  protected veiwType: string;
  protected title: string;
  protected resourceRoot: string;
  protected scriptPath?: string = undefined;

  protected constructor(viewType: string, title: string, resourceRoot: string) {
    this.veiwType = viewType;
    this.title = title;
    this.resourceRoot = resourceRoot;
  }

  public async loadWebpage(htmlPath: string, scriptPath?: string, localeDomains?: string[]): Promise<void> {
    this.html = await readFileAsync(htmlPath, 'utf8');

    if (scriptPath) {
      this.scriptPath = scriptPath;
    }

    if (localeDomains) {
      localeDomains.push('ui');
    } else {
      localeDomains = ['ui'];
    }
    const defaultDomain = localeDomains[0];

    localeDomains.forEach((domain) => {
      this.html +=
        `\r\n<script data-locale data-domain="${domain}"${defaultDomain === domain ? ' data-default-domain' : ''} type="application/json">` +
        JSON.stringify(loadLocaleFile(domain)) +
        '</script>\r\n';
    });
  }

  private replaceResources(webview: vscode.Webview) {
    if (this.scriptPath) {
      this.html += this.getScriptTag(this.scriptPath, webview);
    }
    this.html += this.getScriptTag(path.join(extensionContext.extensionPath, 'resources', 'dist', 'localeloader.js'), webview);
    const onDiskPath = vscode.Uri.file(extensionContext.extensionPath);
    const replacePath = webview.asWebviewUri(onDiskPath)
    this.html = this.html.replace(/replaceresource/g, replacePath.toString());
  }

  public displayWebView(showOptions: vscode.ViewColumn | { preserveFocus: boolean, viewColumn: vscode.ViewColumn },
                        reveal?: boolean, options?: vscode.WebviewPanelOptions & vscode.WebviewOptions) {
    if (this.webview === undefined) {
      this.webview = vscode.window.createWebviewPanel(this.veiwType, this.title, showOptions, options);
      this.webview.iconPath = vscode.Uri.file(path.join(this.resourceRoot, 'wpilib-128.png'));
      this.replaceResources(this.webview.webview);
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

  private getScriptTag(scriptPath: string, webview: vscode.Webview) {
    let html = '';
    const scriptOnDisk = vscode.Uri.file(scriptPath);
    // get the special URI to use with the webview
    const scriptResourcePath = webview.asWebviewUri(scriptOnDisk);
    html += '\r\n<script src="';
    html += scriptResourcePath.toString();
    html += '">\r\n';
    html += '\r\n</script>\r\n';
    return html;
  }
}
