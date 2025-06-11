'use strict';
import * as path from 'path';
import * as vscode from 'vscode';
import { extensionContext } from '../utilities';
import { WebViewBase } from './webviewbase';

export class Help extends WebViewBase {
  public static async Create(resourceRoot: string): Promise<Help> {
    const help = new Help(resourceRoot);
    await help.asyncInitialize();
    return help;
  }

  private constructor(resourceRoot: string) {
    super('wpilibhelp', 'WPILib Help', resourceRoot);

    this.disposables.push(
      vscode.commands.registerCommand('wpilibcore.help', () => {
        this.displayHelp();
      })
    );
  }

  public displayHelp() {
    this.displayWebView(vscode.ViewColumn.Active);
  }

  private async asyncInitialize() {
    await this.loadWebpage(
      path.join(extensionContext.extensionPath, 'resources', 'webviews', 'help.html')
    );
  }
}
