'use strict';

import * as vscode from 'vscode';
import { IPreferencesAPI } from '../shared/externalapi';
import { PropertiesStore } from './propertiesstore';

export class CppStatusBar {
  private statusBar: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  constructor(preferences: IPreferencesAPI, propertiesStore: PropertiesStore) {
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
    this.disposables.push(this.statusBar);

    this.statusBar.command = 'wpilibcpp.toggleRioDesktop';
    this.statusBar.text = 'roboRIO';

    const workspaces = vscode.workspace.workspaceFolders;

    // If any workspace is a C++ workspace, show the toggle
    if (workspaces !== undefined) {
      for (const wp of workspaces) {
        const prop = preferences.getPreferences(wp);
        if (prop !== undefined) {
          if (prop.getIsWPILibProject() && prop.getCurrentLanguage() === 'cpp') {
            this.statusBar.show();
            break;
          }
        }
      }
    }

    this.disposables.push(vscode.commands.registerCommand('wpilibcpp.toggleRioDesktop', async () => {
      // Toggle all configurations
      for (const props of propertiesStore.getVscodeCppProperties()) {
        const toggle = await props.toggleConfiguration();
        if (toggle) {
          this.statusBar.text = 'roboRIO';
        } else {
          this.statusBar.text = 'Desktop';
        }
      }
    }));
  }

  public dispose() {
    this.statusBar.dispose();
  }
}
