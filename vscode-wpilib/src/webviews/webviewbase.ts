'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { loadLocaleFile } from '../locale';
import { logger } from '../logger';
import { extensionContext, readFileAsync } from '../utilities';
import { rewriteDistWebviewHtml } from './distWebviewHtml';

export abstract class WebViewBase {
  protected html = '';
  protected webview?: vscode.WebviewPanel;
  protected disposables: vscode.Disposable[] = [];

  constructor(
    protected readonly viewType: string,
    protected readonly title: string,
    protected readonly resourceRoot: string
  ) {}

  public async loadWebpage(
    htmlPath: string,
    localeDomains?: string[]
  ): Promise<void> {
    try {
      this.html = await readFileAsync(htmlPath, 'utf8');
    } catch (err) {
      logger.error('Failed to read HTML file', err);
      return;
    }

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
      this.webview.webview.html = this.rewriteHtml(this.webview.webview);

      this.webview.onDidDispose(() => (this.webview = undefined));
    }

    if (reveal) this.webview.reveal();
  }

  public dispose(): void {
    this.webview?.dispose();
    for (const d of this.disposables) d.dispose();
  }

  private rewriteHtml(webview: vscode.Webview): string {
    return rewriteDistWebviewHtml({
      webview,
      extensionRoot: vscode.Uri.file(extensionContext.extensionPath),
      html: this.html,
      extraCss: [
        vscode.Uri.file(path.join(extensionContext.extensionPath, 'resources', 'media', 'icons.css')),
        vscode.Uri.file(
          path.join(extensionContext.extensionPath, 'resources', 'media', 'vscode-elements.css')
        ),
        vscode.Uri.file(path.join(extensionContext.extensionPath, 'resources', 'media', 'main.css')),
      ],
    });
  }
}
