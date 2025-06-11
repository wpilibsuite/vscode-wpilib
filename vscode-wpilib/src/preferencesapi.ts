'use strict';
import * as vscode from 'vscode';
import { IPreferences, IPreferencesAPI, IPreferencesChangedPair } from 'vscode-wpilibapi';
import { Preferences } from './preferences';

// Stores the preferences provider for WPILib
// Each workspace can have its own preferences, so this provides for each workspace
export class PreferencesAPI implements IPreferencesAPI {
  // Async create to allow asynchronous initialization
  public static async Create(): Promise<PreferencesAPI> {
    const prefs = new PreferencesAPI();
    await prefs.asyncInitialize();
    return prefs;
  }

  // Event fires when the workspace folders change and new preferences are loaded
  public onDidPreferencesFolderChanged: vscode.Event<IPreferencesChangedPair[]>;

  private preferences: Preferences[] = [];
  private preferencesEmitter: vscode.EventEmitter<IPreferencesChangedPair[]> =
    new vscode.EventEmitter<IPreferencesChangedPair[]>();
  private disposables: vscode.Disposable[] = [];

  private constructor() {
    this.onDidPreferencesFolderChanged = this.preferencesEmitter.event;
  }

  // Get the preferences for a specific workspace
  public getPreferences(workspace: vscode.WorkspaceFolder): IPreferences {
    for (const p of this.preferences) {
      if (p.workspace.uri === workspace.uri) {
        return p;
      }
    }
    return this.preferences[0];
  }

  // Get the first workspace if there is only one, or ask for a workspace and provide it.
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

  private async asyncInitialize() {
    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces !== undefined) {
      for (const w of workspaces) {
        const preferences = await Preferences.Create(w);
        this.preferences.push(preferences);
      }
    }
    this.disposables.push(this.preferencesEmitter);

    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        // Nuke and reset
        // TODO: Remove existing preferences from the extension context
        for (const p of this.preferences) {
          p.dispose();
        }

        const wp = vscode.workspace.workspaceFolders;

        if (wp === undefined) {
          return;
        }

        const pairArr: IPreferencesChangedPair[] = [];
        this.preferences = [];

        for (const w of wp) {
          const p = await Preferences.Create(w);
          this.preferences.push(p);
          const pair: IPreferencesChangedPair = {
            preference: p,
            workspace: w,
          };
          pairArr.push(pair);
        }

        this.preferencesEmitter.fire(pairArr);

        this.disposables.push(...this.preferences);
      })
    );
    this.disposables.push(...this.preferences);
  }
}
