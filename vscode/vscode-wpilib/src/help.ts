'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IPreferencesAPI } from './shared/externalapi';

export class Help {
  private statusBar: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private html: string = '';
  private webview: vscode.WebviewPanel | undefined;

  constructor(resourceRoot: string, preferences: IPreferencesAPI) {
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    this.statusBar.text = 'WPILib';
    this.statusBar.command = 'wpilibcore.help';
    this.disposables.push(this.statusBar);

    this.disposables.push(vscode.commands.registerCommand('wpilibcore.help', async () => {
      await this.showHelpView();
    }));

    this.html = fs.readFileSync(path.join(resourceRoot, 'help.html'), 'utf8');
    this.replaceResources(resourceRoot);

    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces !== undefined) {
      for (const wp of workspaces) {
        const prefs = preferences.getPreferences(wp);
        if (prefs === undefined) {
          continue;
        }
        if (prefs.getIsWPILibProject()) {
          this.statusBar.show();
          break;
        }
      }
    }
  }

  public async showHelpView(): Promise<void> {
    if (this.webview === undefined) {
      this.webview = vscode.window.createWebviewPanel('wpilibhelp', 'WPILib Help', vscode.ViewColumn.Active);
      this.webview.webview.html = this.html;
      this.webview.onDidDispose(_ => {
        this.webview = undefined;
      });
    }
    this.webview.reveal();
  }

  private replaceResources(resourceRoot: string) {

    const onDiskPath = vscode.Uri.file(resourceRoot);
    const replacePath = onDiskPath.with({ scheme: 'vscode-resource' });
    this.html = this.html.replace(/replaceresource/g, replacePath.toString());
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
