'use strict';
import * as path from 'path';
import * as vscode from 'vscode';
import { extensionContext } from '../utilities';
import { WebViewBase } from './webviewbase';

export class AlphaError extends WebViewBase {
  public static async Create(resourceRoot: string): Promise<AlphaError> {
    const help = new AlphaError(resourceRoot);
    await help.asyncInitialize();
    return help;
  }

  private constructor(resourceRoot: string) {
    super('alphaerror', 'WPILib Alpha Error', resourceRoot);
  }

  public displayPage() {
    this.displayWebView(vscode.ViewColumn.Active);
  }

  private async asyncInitialize() {
    await this.loadWebpage(path.join(extensionContext.extensionPath, 'resources', 'webviews', 'alphaerror.html'));
  }
}
