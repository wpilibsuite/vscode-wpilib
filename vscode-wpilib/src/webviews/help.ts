'use strict';
import * as path from 'path';
import * as vscode from 'vscode';
import { IPreferencesAPI } from '../shared/externalapi';
import { extensionContext } from '../utilities';
import { WebViewBase } from './webviewbase';

export class Help extends WebViewBase {
  public static async Create(preferences: IPreferencesAPI): Promise<Help> {
    const help = new Help(preferences);
    await help.asyncInitialize();
    return help;
  }

  private statusBar: vscode.StatusBarItem;
  private preferences: IPreferencesAPI;

  private constructor(preferences: IPreferencesAPI) {
    super('wpilibhelp', 'WPILib Help');
    this.preferences = preferences;
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    this.statusBar.text = 'WPILib';
    this.statusBar.tooltip = 'Open WPILib Help';
    this.statusBar.command = 'wpilibcore.help';
    this.disposables.push(this.statusBar);

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.help', async () => {
      await this.displayWebView(vscode.ViewColumn.Active);
    }));
  }

  private async asyncInitialize() {
    await this.loadWebpage(path.join(extensionContext.extensionPath, 'resources', 'webviews', 'help.html'));

    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces !== undefined) {
      for (const wp of workspaces) {
        const prefs = this.preferences.getPreferences(wp);
        if (prefs.getIsWPILibProject()) {
          this.statusBar.show();
          break;
        }
      }
    }
  }
}
