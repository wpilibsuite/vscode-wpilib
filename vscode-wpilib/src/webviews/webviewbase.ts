'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { loadLocaleFile } from '../locale';
import { extensionContext, readFileAsync } from '../utilities';
import { logger } from '../logger';

export abstract class WebViewBase {
  protected html: string = '';
  protected webview: vscode.WebviewPanel | undefined;
  protected disposables: vscode.Disposable[] = [];
  protected viewType: string;
  protected title: string;
  protected resourceRoot: string;
  protected scriptPath?: string = undefined;

  protected constructor(viewType: string, title: string, resourceRoot: string) {
    this.viewType = viewType;
    this.title = title;
    this.resourceRoot = resourceRoot;
  }

  public async loadWebpage(
    htmlPath: string,
    scriptPath?: string,
    localeDomains?: string[]
  ): Promise<void> {
    try {
      this.html = await readFileAsync(htmlPath, 'utf8');
    } catch (err) {
      logger.error('Failed to read HTML file', err);
      return;
    }

    if (scriptPath) {
      this.scriptPath = scriptPath;
    }

    this.html = this.html.replace(
      '</head>',
      `<link rel="stylesheet" href="replaceresource/resources/media/icons.css" />\r\n<link rel="stylesheet" href="replaceresource/resources/media/vscode-elements.css" />\r\n<link rel="stylesheet" href="replaceresource/resources/media/main.css" />\r\n</head>`
    );

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
    // Add CSS for main.css
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionContext.extensionPath, 'resources', 'media', 'main.css'))
    );
    // Add CSS for vscode-elements.css
    const elementsCssUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(extensionContext.extensionPath, 'resources', 'media', 'vscode-elements.css')
      )
    );
    // Add CSS for icons.css
    const iconsCssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionContext.extensionPath, 'resources', 'media', 'icons.css'))
    );
    // Update the CSS paths with the webview URI
    this.html = this.html.replace('replaceresource/media/main.css', cssUri.toString());
    this.html = this.html.replace(
      'replaceresource/media/vscode-elements.css',
      elementsCssUri.toString()
    );
    this.html = this.html.replace('replaceresource/media/icons.css', iconsCssUri.toString());

    // Add script path if provided
    if (this.scriptPath) {
      this.html += this.getScriptTag(this.scriptPath, webview);
    }

    // Add locale loader script
    this.html += this.getScriptTag(
      path.join(extensionContext.extensionPath, 'resources', 'dist', 'localeloader.js'),
      webview
    );

    // Replace resource paths
    const onDiskPath = vscode.Uri.file(extensionContext.extensionPath);
    const replacePath = webview.asWebviewUri(onDiskPath);
    this.html = this.html.replace(/replaceresource/g, replacePath.toString());
  }

  public displayWebView(
    showOptions: vscode.ViewColumn | { preserveFocus: boolean; viewColumn: vscode.ViewColumn },
    reveal?: boolean,
    options?: vscode.WebviewPanelOptions & vscode.WebviewOptions
  ) {
    if (this.webview === undefined) {
      this.webview = vscode.window.createWebviewPanel(this.viewType, this.title, showOptions, {
        enableScripts: true,
        retainContextWhenHidden: true,
        ...(options || {}),
        localResourceRoots: [
          vscode.Uri.file(extensionContext.extensionPath),
          vscode.Uri.file(path.join(extensionContext.extensionPath, 'resources', 'media')),
        ],
      });
      this.webview.iconPath = vscode.Uri.file(path.join(this.resourceRoot, 'wpilib-icon-128.png'));
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
