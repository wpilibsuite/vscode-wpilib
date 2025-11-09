'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { loadLocaleFile } from '../locale';
import { logger } from '../logger';
import { extensionContext, readFileAsync } from '../utilities';

export abstract class WebViewBase {
  protected html = '';
  protected webview?: vscode.WebviewPanel;
  protected disposables: vscode.Disposable[] = [];
  protected scriptPath?: string;

  constructor(
    protected readonly viewType: string,
    protected readonly title: string,
    protected readonly resourceRoot: string
  ) {}

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

    this.scriptPath = scriptPath;

    this.html = this.html.replace(
      '</head>',
      `<link rel="stylesheet" href="replaceresource/resources/media/icons.css" />
      <link rel="stylesheet" href="replaceresource/resources/media/vscode-elements.css" />
      <link rel="stylesheet" href="replaceresource/resources/media/main.css" /></head>
      `
    );

    const specifiedDomains = Array.isArray(localeDomains) ? localeDomains.filter(Boolean) : [];
    if (!specifiedDomains.includes('ui')) {
      specifiedDomains.push('ui');
    }
    const uniqueDomains = [...new Set(specifiedDomains)];

    if (uniqueDomains.length > 0) {
      const defaultDomain = uniqueDomains[0];
      const scriptBlocks = uniqueDomains
        .map((domain) => {
          const localeJson = JSON.stringify(loadLocaleFile(domain)).replace(
            /<\/(script)/gi,
            '<\\/$1'
          );
          const defaultAttr = defaultDomain === domain ? ' data-default-domain' : '';
          return `<script data-locale data-domain="${domain}"${defaultAttr} type="application/json">${localeJson}</script>`;
        })
        .join('\n');

      if (this.html.includes('</body>')) {
        this.html = this.html.replace('</body>', `${scriptBlocks}\n</body>`);
      } else {
        this.html += `\n${scriptBlocks}\n`;
      }
    }
  }

  public displayWebView(
    showOptions: vscode.ViewColumn | { preserveFocus: boolean; viewColumn: vscode.ViewColumn },
    reveal?: boolean,
    options?: vscode.WebviewPanelOptions & vscode.WebviewOptions
  ): void {
    if (!this.webview) {
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

      this.webview.onDidDispose(() => (this.webview = undefined));
    }

    if (reveal) this.webview.reveal();
  }

  public dispose(): void {
    this.webview?.dispose();
    for (const d of this.disposables) d.dispose();
  }

  private replaceResources(webview: vscode.Webview): void {
    const cssMain = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionContext.extensionPath, 'resources', 'media', 'main.css'))
    );
    const cssElems = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionContext.extensionPath, 'resources', 'media', 'vscode-elements.css'))
    );
    const cssIcons = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionContext.extensionPath, 'resources', 'media', 'icons.css'))
    );

    this.html = this.html
      .replace('replaceresource/resources/media/main.css', cssMain.toString())
      .replace('replaceresource/resources/media/vscode-elements.css', cssElems.toString())
      .replace('replaceresource/resources/media/icons.css', cssIcons.toString());

    this.html = this.html.replace(
      /<script\s+src\s*=\s*["']replaceresource\/dist\/([^"']+)["']\s*><\/script>/gi,
      (_, fileName: string) => {
        const abs = path.join(extensionContext.extensionPath, 'resources', 'dist', fileName);
        const uri = webview.asWebviewUri(vscode.Uri.file(abs));
        return `<script src="${uri.toString()}"></script>`;
      }
    );

    if (this.scriptPath && !this.html.includes(path.basename(this.scriptPath))) {
      const tag = this.buildScriptTag(this.scriptPath, webview);
      this.html = this.html.includes('</body>')
        ? this.html.replace('</body>', `${tag}</body>`)
        : this.html + tag;
    }

    const localeLoaderPath = path.join(
      extensionContext.extensionPath,
      'resources',
      'dist',
      'localeloader.js'
    );
    const localeLoaderFileName = path.basename(localeLoaderPath);
    if (!this.html.includes(localeLoaderFileName)) {
      const loaderTag = this.buildScriptTag(localeLoaderPath, webview);
      this.html = this.html.includes('</body>')
        ? this.html.replace('</body>', `${loaderTag}</body>`)
        : this.html + loaderTag;
    }

    const baseUri = webview.asWebviewUri(vscode.Uri.file(extensionContext.extensionPath));
    this.html = this.html.replace(/replaceresource/g, baseUri.toString());
  }

  private buildScriptTag(scriptPath: string, webview: vscode.Webview): string {
    const uri = webview.asWebviewUri(vscode.Uri.file(scriptPath));
    return `\n<script src="${uri.toString()}"></script>\n`;
  }
}
