'use strict';
import * as path from 'path';
import * as vscode from 'vscode';
import { IPreferencesAPI } from './shared/externalapi';
import { promisifyReadFile } from './utilities';

export class Help {
  public static async Create(resourceRoot: string, preferences: IPreferencesAPI): Promise<Help> {
    const help = new Help(preferences);
    await help.asyncInitialize(resourceRoot);
    return help;
  }

  private statusBar: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private html: string = '';
  private webview: vscode.WebviewPanel | undefined;
  private preferences: IPreferencesAPI;

  private constructor(preferences: IPreferencesAPI) {
    this.preferences = preferences;
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    this.statusBar.text = 'WPILib';
    this.statusBar.tooltip = 'Open WPILib Help';
    this.statusBar.command = 'wpilibcore.help';
    this.disposables.push(this.statusBar);

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.help', async () => {
      await this.showHelpView();
    }));
  }

  public async showHelpView(): Promise<void> {
    if (this.webview === undefined) {
      this.webview = vscode.window.createWebviewPanel('wpilibhelp', 'WPILib Help', vscode.ViewColumn.Active);
      this.webview.webview.html = this.html;
      this.webview.onDidDispose((_) => {
        this.webview = undefined;
      });
    }
    this.webview.reveal();
  }

  public dispose() {
    if (this.webview !== undefined) {
      this.webview.dispose();
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  private async asyncInitialize(resourceRoot: string) {
    this.html = await promisifyReadFile(path.join(resourceRoot, 'help.html'));
    this.replaceResources(resourceRoot);

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

  private replaceResources(resourceRoot: string) {
    const onDiskPath = vscode.Uri.file(resourceRoot);
    const replacePath = onDiskPath.with({ scheme: 'vscode-resource' });
    this.html = this.html.replace(/replaceresource/g, replacePath.toString());
  }
}
