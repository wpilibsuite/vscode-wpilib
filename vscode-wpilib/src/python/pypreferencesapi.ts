'use strict';
import * as vscode from 'vscode';
import { PyPreferences } from './pypreferences';

export interface IPyPreferencesChangedPair {
  workspace: vscode.WorkspaceFolder;
  preference: PyPreferences;
}

export class PyPreferencesAPI {
  public onDidPreferencesFolderChanged: vscode.Event<IPyPreferencesChangedPair[]>;
  private preferences: PyPreferences[] = [];
  private preferencesEmitter: vscode.EventEmitter<IPyPreferencesChangedPair[]> = new vscode.EventEmitter<IPyPreferencesChangedPair[]>();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.onDidPreferencesFolderChanged = this.preferencesEmitter.event;

    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces !== undefined) {
      for (const w of workspaces) {
        this.preferences.push(new PyPreferences(w));
      }
    }
    this.disposables.push(this.preferencesEmitter);

    this.disposables.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
      // Nuke and reset
      // TODO: Remove existing preferences from the extension context
      for (const p of this.preferences) {
        p.dispose();
      }

      const wp = vscode.workspace.workspaceFolders;

      if (wp === undefined) {
        return;
      }

      const pairArr: IPyPreferencesChangedPair[] = [];
      this.preferences = [];

      for (const w of wp) {
        const p = new PyPreferences(w);
        this.preferences.push(p);
        const pair: IPyPreferencesChangedPair = {
          preference: p,
          workspace: w,
        };
        pairArr.push(pair);
      }

      this.preferencesEmitter.fire(pairArr);

      this.disposables.push(...this.preferences);
    }));
    this.disposables.push(...this.preferences);

  }

  public getPreferences(workspace: vscode.WorkspaceFolder): PyPreferences {
    for (const p of this.preferences) {
      if (p.workspace.uri === workspace.uri) {
        return p;
      }
    }
    return this.preferences[0];
  }

  public async getFirstOrSelectedWorkspace(): Promise<vscode.WorkspaceFolder | undefined> {
    const wp = vscode.workspace.workspaceFolders;
    if (wp === undefined) {
      return undefined;
    }

    if (wp.length > 1) {
      const res = await vscode.window.showWorkspaceFolderPick();
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

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
