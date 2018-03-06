'use strict';
import { IPreferencesAPI, IPreferencesChangedPair, IPreferences } from './shared/externalapi';
import * as vscode from 'vscode';
import { Preferences } from './preferences';

export class PreferencesAPI extends IPreferencesAPI {
  private preferences: Preferences[] = [];
  private preferencesEmitter: vscode.EventEmitter<IPreferencesChangedPair[]> = new vscode.EventEmitter<IPreferencesChangedPair[]>();
  private disposables: vscode.Disposable[] = [];
  onDidPreferencesFolderChanged: vscode.Event<IPreferencesChangedPair[]>;


  constructor() {
    super();
    this.onDidPreferencesFolderChanged = this.preferencesEmitter.event;

    let workspaces = vscode.workspace.workspaceFolders;
    if (workspaces !== undefined) {
      for (let w of workspaces) {
        this.preferences.push(new Preferences(w));
      }
    }
    this.disposables.push(this.preferencesEmitter);

    this.disposables.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
      // Nuke and reset
      // TODO: Remove existing preferences from the extension context
      for (let p of this.preferences) {
        p.dispose();
      }

      let wp = vscode.workspace.workspaceFolders;

      if (wp === undefined) {
        return;
      }

      let pairArr: IPreferencesChangedPair[] = [];
      this.preferences = [];

      for (let w of wp) {
        let p = new Preferences(w);
        this.preferences.push(p);
        let pair: IPreferencesChangedPair = {
          workspace: w,
          preference: p
        };
        pairArr.push(pair);
      }

      this.preferencesEmitter.fire(pairArr);

      this.disposables.push(...this.preferences);
    }));
    this.disposables.push(...this.preferences);

  }

  getPreferences(workspace: vscode.WorkspaceFolder): IPreferences | undefined {
    for (let p of this.preferences) {
      if (p.workspace.uri === workspace.uri) {
          return p;
      }
  }
  return undefined;
  }

  async getFirstOrSelectedWorkspace(): Promise<vscode.WorkspaceFolder | undefined> {
    let wp = vscode.workspace.workspaceFolders;
    if (wp === undefined) {
      return undefined;
    }

    if (wp.length > 1) {
      let res = await vscode.window.showWorkspaceFolderPick();
      if (res !== undefined) {
        return res;
      }
      return undefined;
    } else if (wp.length === 1) {
      return wp[0];
    } else {
      return undefined;
    }
  }

  dispose() {
    for (let d of this.disposables) {
      d.dispose();
    }
  }
}
